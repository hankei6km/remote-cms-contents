import { jest } from '@jest/globals'

jest.unstable_mockModule('contentful', async () => {
  const mockCreateClient = jest.fn()
  const mockGetEntries = jest.fn()
  let res: any = {}
  const reset = () => {
    res = {
      sys: {},
      items: [
        {
          sys: {
            id: 'id1',
            createdAt: '2021-11-10T07:47:13.673Z',
            updatedAt: '2021-11-10T10:29:51.095Z'
          },
          fields: {
            id: 'fid1',
            title: 'title1',
            richt: {
              nodeType: 'document',
              content: [
                {
                  nodeType: 'paragraph',
                  content: [
                    {
                      nodeType: 'text',
                      value: 'Hello world!',
                      marks: []
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          sys: {
            id: 'id2',
            createdAt: '2021-11-10T07:47:13.673Z',
            updatedAt: '2021-11-10T10:29:51.095Z'
          },
          fields: {
            id: 'fid2',
            title: 'title2',
            richt: {
              nodeType: 'document',
              content: [
                {
                  nodeType: 'paragraph',
                  content: [
                    {
                      nodeType: 'text',
                      value: 'Hello world!',
                      marks: []
                    }
                  ]
                },
                {
                  nodeType: 'embedded-asset-block',
                  content: [],
                  data: {
                    target: {
                      fields: {
                        title: 'image1',
                        description: 'image1 description',
                        file: {
                          url: '//images.ctfassets.net/image1.jpg',
                          details: {
                            size: 100,
                            image: {
                              width: 600,
                              height: 400
                            }
                          },
                          fileName: 'image1.jpg',
                          contentType: 'image/jpeg'
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    }
  }
  reset()
  return {
    default: {
      createClient: mockCreateClient.mockReturnValue({
        getEntries: mockGetEntries.mockImplementation(async () => {
          return res
        })
      })
    },
    _reset: reset,
    _data: (d: any) => {
      res = d
    },
    _getMocks: () => ({
      mockCreateClient,
      mockGetEntries
    })
  }
})

const mockCtf = await import('contentful')
const { mockCreateClient, mockGetEntries } = (mockCtf as any)._getMocks()
const { client } = await import('../../../src/lib/clients/contentful.js')

afterEach(async () => {
  ;(mockCtf as any)._reset()
})

describe('client_contentful', () => {
  it('should get rendered contents from Contentful space', async () => {
    const n = new Date().toUTCString()

    const res = client({
      apiBaseURL: '',
      apiName: 'contentmodel',
      credential: ['spcaeId', 'cda_token']
    })
      .request()
      .fetch()
    expect(mockCreateClient).toHaveBeenLastCalledWith({
      space: 'spcaeId',
      accessToken: 'cda_token'
    })
    expect(await res).toEqual({
      contents: [
        {
          id: 'id1',
          createdAt: '2021-11-10T07:47:13.673Z',
          updatedAt: '2021-11-10T10:29:51.095Z',
          sys: {
            id: 'id1',
            createdAt: '2021-11-10T07:47:13.673Z',
            updatedAt: '2021-11-10T10:29:51.095Z'
          },
          fields: {
            id: 'fid1',
            title: 'title1',
            richt: '<p>Hello world!</p>'
          }
        },
        {
          id: 'id2',
          createdAt: '2021-11-10T07:47:13.673Z',
          updatedAt: '2021-11-10T10:29:51.095Z',
          sys: {
            id: 'id2',
            createdAt: '2021-11-10T07:47:13.673Z',
            updatedAt: '2021-11-10T10:29:51.095Z'
          },
          fields: {
            id: 'fid2',
            title: 'title2',
            richt:
              '<p>Hello world!</p><p><img alt="image1" src="//images.ctfassets.net/image1.jpg" width="600" height="400"></p>'
          }
        }
      ]
    })
    expect(mockGetEntries).toHaveBeenLastCalledWith({
      content_type: 'contentmodel'
    })
  })
})

export {}
