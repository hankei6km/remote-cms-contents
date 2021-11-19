import path from 'path'
import { writeFile } from 'fs/promises'
import matter from 'gray-matter'
import { BaseFlds, MapConfig, MapFldsImage } from '../types/map.js'
import { fileNameFromURL, isImageDownload, mappingFlds } from './map.js'
import { FetchResult, TransformContent } from '../types/client.js'
import { SaveRemoteContentOptions } from '../types/content.js'
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

function transformContent(m: MapConfig): TransformContent {
  const ret: TransformContent = (content) => {
    const valueType = typeof content
    if (
      (valueType === 'number' ||
        valueType === 'string' ||
        valueType === 'object') &&
      m.transformJsonata
    ) {
      try {
        const ret = m.transformJsonata.evaluate(content)
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
          } value=${JSON.stringify(content)}`
        )
      }
    }
    return content
  }
  return ret
}

export async function saveRemoteContent({
  client,
  apiName,
  mapConfig,
  dstContentDir,
  dstImagesDir,
  staticRoot,
  filter
}: SaveRemoteContentOptions): Promise<Error | null> {
  let ret: Error | null = null
  try {
    const c = client
      .request()
      .api(apiName)
      .skip(skip)
      .limit(limit)
      .pageSize(pageSize)
      .filter(filter)
      .transform(transformContent(mapConfig))
    let position = 0
    for await (let res of c.fetch()) {
      const contenSrc = res.content
      const len = contenSrc.length
      const content: BaseFlds[] = new Array(len) as BaseFlds[]
      for (let idx = 0; idx < len; idx++) {
        content[idx] = await mappingFlds(contenSrc[idx], mapConfig)
      }
      // 途中で field の入れ替えがごちゃっとしている.
      // 新しい配列に map する処理に変更を検討.
      for (let idx = 0; idx < len; idx++) {
        const fldsArray: [string, any][] = Object.entries(content[idx])
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
        const flds: BaseFlds = { ...content[idx] }
        fldsArray.forEach(([k, v]) => (flds[k] = v))
        ret = await saveContentFile(flds, dstContentDir, position++)
        if (ret) {
          break
        }
      }
    }
  } catch (err: any) {
    // console.log('err:', err);
    ret = new Error(`saveRemoteContent error: ${err}`)
  }
  return ret
}
