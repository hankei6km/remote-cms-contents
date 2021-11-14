import path from 'path'
import { writeFile } from 'fs/promises'
import matter from 'gray-matter'
import { BaseFlds, MapConfig, MapFldsImage } from '../types/map.js'
import { fileNameFromURL, isImageDownload, mappingFlds } from './map.js'
import { FetchResult, TransformContents } from '../types/client.js'
import { SaveRemoteContentsOptions } from '../types/content.js'
import { imageInfoFromSrc, saveImageFile } from './media.js'

export async function saveContentFile(
  flds: BaseFlds,
  dstDir: string,
  position: number
): Promise<Error | null> {
  let ret: Error | null = null

  const savePath = `${path.resolve(dstDir, flds.id)}.md`

  try {
    const { content, ...metaData } = flds
    if (typeof metaData === 'object') {
      Object.entries(metaData).forEach(([k, v]) => {
        if (v === undefined) {
          delete metaData[k]
        }
      })
    }
    // content は string を期待しているが、異なる場合もある、かな.
    const file = matter.stringify(content !== undefined ? `${content}` : '', {
      ...metaData,
      position
    })
    await writeFile(savePath, file)
  } catch (err: any) {
    ret = new Error(`saveFile error: ${err}`)
  }

  return ret
}

// size が array のときは無視するようにしたので使わない.
// export function dimensionsValue(
//   dimensions: ISize,
//   prop: 'width' | 'height'
// ): number {
//   let ret = 0
//   if (Array.isArray(dimensions)) {
//     if (dimensions.length > 0) {
//       const c = dimensions[0]
//       ret = c[prop] !== undefined ? c[prop] : 0
//     }
//   } else {
//     const p = dimensions[prop]
//     ret = p !== undefined ? p : 0
//   }
//   return ret
// }

function transformContents(m: MapConfig): TransformContents {
  return (contents: FetchResult['contents']) => {
    const valueType = typeof contents
    if (
      (valueType === 'number' ||
        valueType === 'string' ||
        valueType === 'object') &&
      m.transformJsonata
    ) {
      try {
        const ret = m.transformJsonata.evaluate(contents)
        if (!Array.isArray(ret)) {
          throw new Error(
            `transformFldValue: result is not array: transform=${m.transform}`
          )
        }
        return ret
      } catch (err: any) {
        throw new Error(
          `transformFldValue: transform=${m.transform} message=${
            err.message
          } value=${JSON.stringify(contents)}`
        )
      }
    }
    return contents
  }
}

export async function saveRemoteContents({
  client,
  apiName,
  mapConfig,
  dstContentsDir,
  dstImagesDir,
  staticRoot,
  filter
}: SaveRemoteContentsOptions): Promise<Error | null> {
  let ret: Error | null = null
  try {
    const res = await client
      .request()
      .api(apiName)
      .filter(filter)
      .transform(transformContents(mapConfig))
      .fetch()
    const contentSrc = res.contents
    const len = contentSrc.length
    const contents: BaseFlds[] = new Array(len) as BaseFlds[]
    for (let idx = 0; idx < len; idx++) {
      contents[idx] = await mappingFlds(contentSrc[idx], mapConfig)
    }
    // 途中で field の入れ替えがごちゃっとしている.
    // 新しい配列に map する処理に変更を検討.
    for (let idx = 0; idx < len; idx++) {
      const fldsArray: [string, any][] = Object.entries(contents[idx])
      const fldsLen = fldsArray.length
      for (let fldsIdx = 0; fldsIdx < fldsLen; fldsIdx++) {
        const c = fldsArray[fldsIdx]
        const imageFld: MapFldsImage | undefined = (() => {
          const mapIdx = mapConfig.flds.findIndex(
            ({ dstName, fldType }) => dstName === c[0] && fldType === 'image'
          )
          if (mapIdx >= 0) {
            return mapConfig.flds[mapIdx] as MapFldsImage
          }
          return
        })()
        if (imageFld) {
          let imageInfo = await imageInfoFromSrc(
            c[1],
            imageFld.setSize || false
          )
          if (isImageDownload(mapConfig, imageInfo)) {
            imageInfo = await saveImageFile(
              imageInfo,
              dstImagesDir,
              staticRoot,
              fileNameFromURL(imageInfo.url, mapConfig, imageFld),
              imageFld.setSize || false
            )
          }
          c[1] = imageInfo
        }
      }
      const flds: BaseFlds = { ...contents[idx] }
      fldsArray.forEach(([k, v]) => (flds[k] = v))
      ret = await saveContentFile(flds, dstContentsDir, idx)
      if (ret) {
        break
      }
    }
  } catch (err: any) {
    // console.log('err:', err);
    ret = new Error(`saveRemoteContents error: ${err}`)
  }
  return ret
}
