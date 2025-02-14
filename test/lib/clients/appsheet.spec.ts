import { jest } from '@jest/globals'
import mockAxiosDefault from 'jest-mock-axios'
import { ResRecord } from '../../../src/types/client.js'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

// await import('axios')
const {
  apiActionPath,
  validateSelctorValue,
  apiActionBodySelector,
  ClientAppSheet
} = await import('../../../src/lib/clients/appsheet.js')

afterEach(() => {
  mockAxios.reset()
})

describe('validateSelctorValue', () => {
  it('should throw error', () => {
    expect(() => validateSelctorValue('abc(123')).toThrowError()
    expect(() => validateSelctorValue('abc)123')).toThrowError()
    expect(() => validateSelctorValue('abc[123')).toThrowError()
    expect(() => validateSelctorValue('abc]123')).toThrowError()
    expect(() => validateSelctorValue('abc"123')).toThrowError()
    expect(() => validateSelctorValue("abc'123")).toThrowError()
  })
  it('should not throw error', () => {
    expect(() => validateSelctorValue('abc123')).not.toThrowError()
  })
})

describe('apiActionBodySelector', () => {
  it('should return filter expression', () => {
    expect(apiActionBodySelector('tbl', [['eq', 'k1', 'v1']])).toEqual(
      'Filter("tbl",[k1]="v1")'
    )
    expect(
      apiActionBodySelector('tbl', [
        ['eq', 'k1', 'v1'],
        ['eq', 'k2', 'v2']
      ])
    ).toEqual('Filter("tbl",And([k1]="v1",[k2]="v2"))')
  })
  it('should return blank', () => {
    expect(apiActionBodySelector('tbl', [])).toEqual('')
  })
})

describe('client_appsheet', () => {
  it('should get bare content(rows) from AppSheet app', async () => {
    const n = new Date().toUTCString()

    const c = new ClientAppSheet({
      apiBaseURL: 'https://api.appsheet.com/api/v2/',
      apiName: 'tbl',
      credential: ['appId', 'secret']
    }).request()
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.post).toHaveBeenLastCalledWith(
      `https://api.appsheet.com/api/v2/${apiActionPath(
        'appId',
        'tbl',
        'secret'
      )}`,
      '{"Action":"Find","Properties":{},"Rows":[]}',
      {
        headers: { 'Content-Type': ' application/json' }
      }
    )
    const mockData = [
      {
        _RowNumber: 1,
        id: 'idstring1',
        createdAt: n,
        updatedAt: n,
        タイトル: 'Title1'
      },
      {
        _RowNumber: 2,
        id: 'idstring2',
        createdAt: n,
        updatedAt: n,
        タイトル: 'Title2'
      }
    ]
    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next).value).toEqual({
      fetch: {
        next: { kind: 'page', hasNextPage: false, endCursor: undefined },
        count: 2
      },
      content: mockData.map((v) => new ResRecord(v))
    })
    expect((await g.next()).done).toBeTruthy()
  })
  it('should get bare content(rows) from AppSheet app with eq()', async () => {
    const n = new Date().toUTCString()

    const c = new ClientAppSheet({
      apiBaseURL: 'https://api.appsheet.com/api/v2/',
      apiName: 'tbl',
      credential: ['appId', 'secret']
    })
      .request()
      .filter([['eq', 'k1', 'v1']])
      .filter([['eq', 'k2', 'v2']])
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.post).toHaveBeenLastCalledWith(
      `https://api.appsheet.com/api/v2/${apiActionPath(
        'appId',
        'tbl',
        'secret'
      )}`,
      '{"Action":"Find","Properties":{"Selector":"Filter(\\"tbl\\",And([k1]=\\"v1\\",[k2]=\\"v2\\"))"},"Rows":[]}',
      {
        headers: { 'Content-Type': ' application/json' }
      }
    )
    const mockData = [
      {
        _RowNumber: 1,
        id: 'idstring1',
        createdAt: n,
        updatedAt: n,
        タイトル: 'Title1'
      },
      {
        _RowNumber: 2,
        id: 'idstring2',
        createdAt: n,
        updatedAt: n,
        タイトル: 'Title2'
      }
    ]
    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next).value).toEqual({
      fetch: {
        next: { kind: 'page', hasNextPage: false, endCursor: undefined },
        count: 2
      },
      content: mockData.map((v) => new ResRecord(v))
    })
    expect((await g.next()).done).toBeTruthy()
  })
})

export {}
