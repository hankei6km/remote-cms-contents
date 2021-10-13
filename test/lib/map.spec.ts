import {
  loadMapconfig,
  mappingFlds,
  validateMapconfig,
  validId
} from '../../src/lib/map.js'

describe('validateMapconfig', () => {
  test('should return MapConfig', () => {
    expect(validateMapconfig({ flds: [] })).toEqual({ flds: [] })
    expect(
      validateMapconfig({
        flds: [
          {
            srcName: 'タイトル',
            dstName: 'title',
            fldType: 'string'
          }
        ]
      })
    ).toEqual({
      flds: [
        {
          srcName: 'タイトル',
          dstName: 'title',
          fldType: 'string'
        }
      ]
    })
  })
  test('should throw error when invalid data passed', () => {
    expect(() => validateMapconfig({})).toThrowError(/flds/)
    expect(() => validateMapconfig({ flds: [], dirty: true })).toThrowError(
      /additional/
    )
  })
})

describe('loadMapconfig', () => {
  test('should load MapConfig from json file', async () => {
    expect(loadMapconfig('test/assets/mapconfig.json')).resolves.toEqual({
      flds: [
        {
          srcName: 'タイトル',
          dstName: 'title',
          fldType: 'string'
        },
        {
          srcName: '画像',
          dstName: 'image',
          fldType: 'image'
        }
      ]
    })
  })
  test('should throw error when invalid type loaded', async () => {
    expect(
      loadMapconfig('test/assets/mapconfig_type_err.json')
    ).rejects.toThrowError(/flds/)
  })
  test('should throw error when invalid json loaded', async () => {
    expect(
      loadMapconfig('test/assets/mapconfig_invalid.json')
    ).rejects.toThrowError(/SyntaxError/)
  })
  test('should throw error when not exist json loaded', async () => {
    expect(
      loadMapconfig('test/assets/mapconfig_not_exist.json')
    ).rejects.toThrowError(/ENOENT/)
  })
})

describe('validId', () => {
  test('should return true', () => {
    expect(validId(123)).toBeTruthy()
    expect(validId('id')).toBeTruthy()
    expect(validId('ID')).toBeTruthy()
    expect(validId('123abcABC')).toBeTruthy()
    expect(validId('123-abc_ABC')).toBeTruthy()
    expect(
      validId(
        '-_0123456789abcdefghijklmnopqrstuvwxyZABCDEFGHIJKLMNOPQRSTUVWXYZ'
      )
    ).toBeTruthy()
  })
  test('should return false', () => {
    expect(validId('')).not.toBeTruthy()
    expect(validId('post.md')).not.toBeTruthy()
    expect(validId('path/../../../../../to/post')).not.toBeTruthy()
  })
})

describe('mappingFlds', () => {
  test('should map flds', () => {
    const n = new Date().toUTCString()
    expect(
      mappingFlds(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title',
          回数: 21,
          タイムスタンプ: n,
          画像: 'アプリ_Images/test.png',
          色: '赤',
          背景色: '青'
        },
        {
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            },
            {
              srcName: 'タイムスタンプ',
              dstName: 'timestamp',
              fldType: 'datetime'
            },
            {
              srcName: '画像',
              dstName: 'image',
              fldType: 'image'
            },
            {
              srcName: '色',
              dstName: 'color',
              fldType: 'enum',
              replace: []
            },
            {
              srcName: '背景色',
              dstName: 'bgColor',
              fldType: 'enum',
              replace: [
                { pattern: '赤', replacement: 'red' },
                { pattern: '青', replacement: 'blue' }
              ]
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      title: 'Title',
      count: 21,
      timestamp: new Date(n),
      image: 'アプリ_Images/test.png',
      color: '赤',
      bgColor: 'blue'
    })
  })
  test('should throw invalid id error ', () => {
    const n = new Date().toUTCString()
    expect(() =>
      mappingFlds(
        {
          _RowNumber: 1,
          id: 'id.string',
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        },
        {
          flds: [
            {
              srcName: '名前',
              dstName: 'filename',
              fldType: 'string'
            }
          ]
        }
      )
    ).toThrow(`mappingFlds: invalid id: value = id.string, params = id, id, id`)
    expect(() =>
      mappingFlds(
        {
          _RowNumber: 1,
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        },
        {
          flds: [
            {
              srcName: '名前',
              dstName: 'filename',
              fldType: 'string'
            }
          ]
        }
      )
    ).toThrow(`mappingFlds: invalid id: value = undefined, params = id, id, id`)
    expect(() =>
      mappingFlds(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        },
        {
          flds: [
            {
              srcName: '名前',
              dstName: 'filename',
              fldType: 'id'
            }
          ]
        }
      )
    ).toThrow(
      `mappingFlds: invalid id: value = file.md, params = 名前, filename, id`
    )
  })
  test('should throw invalid type error ', () => {
    const n = new Date().toUTCString()
    expect(() =>
      mappingFlds(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          回数: '21'
        },
        {
          flds: [
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        }
      )
    ).toThrow(
      `mappingFlds: invalid type: actually type = string, params = 回数, count, number`
    )
  })
  test('should skip no exist flds', () => {
    const n = new Date().toUTCString()
    expect(
      mappingFlds(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          回数: 21
        },
        {
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      count: 21
    })
  })
})
