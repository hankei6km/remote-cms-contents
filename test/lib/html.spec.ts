import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import stringify from 'rehype-stringify'
import {
  firstParagraphAsCodeDockTransformer,
  htmlTo
} from '../../src/lib/html.js'

describe('firstParagraphAsCodeDockTransformer()', () => {
  const f = async (html: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      unified()
        .use(rehypeParse, { fragment: true })
        .use(firstParagraphAsCodeDockTransformer)
        .use(stringify)
        .freeze()
        .process(html, (err, file) => {
          if (err) {
            reject(err)
          }
          resolve(String(file))
        })
    })
  }
  it('should convert paragraph like frontmatter to codedock', async () => {
    expect(await f('<p>test1</p>')).toEqual('<p>test1</p>')
    expect(await f('<p>tes2</p><p>tes3</p>')).toEqual('<p>tes2</p><p>tes3</p>')
    expect(await f('<p>---<br>foo:bar<br>---<br></p><p>tes4</p>')).toEqual(
      '<pre><code>===md\n---\n\nfoo:bar\n\n---\n</code></pre><p>tes4</p>'
    )
    expect(await f('<p>---<br>foo:bar<br>---<br>tes4</p>')).toEqual(
      '<pre><code>===md\n---\n\nfoo:bar\n\n---\n</code></pre><p>tes4</p>'
    )
    expect(await f('<p>---<br>foo:bar<br>---<br><br><br>tes4</p>')).toEqual(
      '<pre><code>===md\n---\n\nfoo:bar\n\n---\n</code></pre><p>tes4</p>'
    )
    expect(
      await f(
        '<p>---<br>foo:&lt;/code&gt;&lt;/pre&gt;<br>---<br></p><p>tes4</p>'
      )
    ).toEqual(
      '<pre><code>===md\n---\n\nfoo:&#x3C;/code>&#x3C;/pre>\n\n---\n</code></pre><p>tes4</p>'
    )
  })
  it('should not convert paragraph(not first)', async () => {
    expect(
      await f('<p>first</p><p>---<br>foo:bar<br>---<br></p><p>tes</p>')
    ).toEqual('<p>first</p><p>---<br>foo:bar<br>---<br></p><p>tes</p>')
  })
  it('should not convert paragraph(included element node)', async () => {
    expect(
      await f(
        '<p>---<br>foo:bar<br><img src="/path/to/img.jpg">---<br></p><p>tes</p>'
      )
    ).toEqual(
      '<p>---<br>foo:bar<br><img src="/path/to/img.jpg">---<br></p><p>tes</p>'
    )
  })
  it('should not convert paragraph(not closed)', async () => {
    expect(await f('<p>---<br>foo:bar<br><br></p><p>tes</p>')).toEqual(
      '<p>---<br>foo:bar<br><br></p><p>tes</p>'
    )
  })
  it('should not convert paragraph(empty)', async () => {
    expect(await f('<p></p><p>tes</p>')).toEqual('<p></p><p>tes</p>')
  })
})

describe('htmlTo() none', () => {
  it('should retrun html as it is', async () => {
    expect(await htmlTo('<p>test1</p>', {})).toEqual('<p>test1</p>')
    expect(
      await htmlTo('<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>', {
        convert: 'none'
      })
    ).toEqual('<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>')
  })
})

describe('htmlTo() html', () => {
  it('should convert html to html', async () => {
    expect(await htmlTo('<p>test1</p>', { convert: 'html' })).toEqual(
      '<p>test1</p>\n'
    )
    expect(
      await htmlTo('<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>', {
        convert: 'html'
      })
    ).toEqual('<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>\n')
  })
  it('should convert front matter', async () => {
    expect(
      await htmlTo(
        '<p>---<br>title: test1<br>---<br></p><h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>',
        {
          convert: 'html',
          toHtmlOpts: { frontMatter: true }
        }
      )
    ).toEqual(
      '---\ntitle: test1\n\n---\n\n<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>\n'
    )
  })
  it('should not convert front matter', async () => {
    expect(
      await htmlTo(
        '<p>---<br>title: test1<br>---<br></p><h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>',
        {
          convert: 'html',
          toHtmlOpts: {}
        }
      )
    ).toEqual(
      '<p>---<br>title: test1<br>---<br></p><h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>\n'
    )
  })
  it('should split paragraph', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1-1<br><br>test1-2</p><h2>head2</h2><p>test2</p>',
        {
          convert: 'html',
          toHtmlOpts: { splitParagraph: true }
        }
      )
    ).toEqual(
      '<h1>head1</h1><p>test1-1</p><p>test1-2</p><h2>head2</h2><p>test2</p>\n'
    )
  })
  it('should not split paragraph', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1-1<br><br>test1-2</p><h2>head2</h2><p>test2</p>',
        {
          convert: 'html',
          toHtmlOpts: {}
        }
      )
    ).toEqual(
      '<h1>head1</h1><p>test1-1<br><br>test1-2</p><h2>head2</h2><p>test2</p>\n'
    )
  })
  it('should replace lf', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1-1\ntest1-2</p><h2>head2</h2><p>test2-1\ntest2-2</p>',
        {
          convert: 'html',
          toHtmlOpts: {}
        }
      )
    ).toEqual(
      '<h1>head1</h1><p>test1-1&#x000a;test1-2</p><h2>head2</h2><p>test2-1&#x000a;test2-2</p>\n'
    )
  })
  it('should not replace lf', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1-1\ntest1-2</p><h2>head2</h2><p>test2-1\ntest2-2</p>',
        {
          convert: 'html',
          toHtmlOpts: { lfTo: '' }
        }
      )
    ).toEqual(
      '<h1>head1</h1><p>test1-1\ntest1-2</p><h2>head2</h2><p>test2-1\ntest2-2</p>\n'
    )
  })
  it('should replace lf without front matter', async () => {
    expect(
      await htmlTo(
        '<p>---<br>title: test1<br>---<br></p><h1>head1</h1><p>test1-1\ntest1-2</p><h2>head2</h2><p>test2-1\ntest2-2</p>',
        {
          convert: 'html',
          toHtmlOpts: { frontMatter: true }
        }
      )
    ).toEqual(
      '---\ntitle: test1\n\n---\n\n<h1>head1</h1><p>test1-1&#x000a;test1-2</p><h2>head2</h2><p>test2-1&#x000a;test2-2</p>\n'
    )
  })
})

describe('htmlTo() markdown', () => {
  it('should convert html to markdown', async () => {
    expect(await htmlTo('<p>test1</p>', { convert: 'markdown' })).toEqual(
      'test1\n'
    )
    expect(
      await htmlTo('<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>', {
        convert: 'markdown'
      })
    ).toEqual('# head1\n\ntest1\n\n## head2\n\ntest2\n')
  })
  it('should convert front matter', async () => {
    expect(
      await htmlTo(
        '<p>---<br>title: test1<br>---<br></p><h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>',
        {
          convert: 'markdown'
        }
      )
    ).toEqual('---\ntitle: test1\n---\n# head1\n\ntest1\n\n## head2\n\ntest2\n')
  })
  it('should convert html embed codedock to markdown', async () => {
    expect(await htmlTo('<p>test1</p>', { convert: 'markdown' })).toEqual(
      'test1\n'
    )
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1</p><pre><code>===md\n[foo](/bar)</code></pre>',
        { convert: 'markdown' }
      )
    ).toEqual('# head1\n\ntest1\n\n[foo](/bar)\n')
  })
  it('should embed attrs of img to alt', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200"></p><h2>head2</h2><p>test2</p>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            imageSalt: {
              command: 'embed',
              baseURL: 'https://localhost:3000/path/to/image.jpg'
            }
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image{width="300" height="200"}](https://localhost:3000/path/to/image.jpg)\n\n## head2\n\ntest2\n'
    )
  })
  it('should embed attrs of img to block', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200"></p><h2>head2</h2><p>test2</p>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            imageSalt: {
              command: 'embed',
              baseURL: 'https://localhost:3000/path/to/image.jpg',
              embed: {
                embedTo: 'block'
              }
            }
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image](https://localhost:3000/path/to/image.jpg){width="300" height="200"}\n\n## head2\n\ntest2\n'
    )
  })
  it('should embed custom attrs', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200" data-salt-thumb></p><h2>head2</h2><p>test2</p>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            imageSalt: {
              command: 'embed',
              baseURL: 'https://localhost:3000/path/to/image.jpg',
              embed: {
                embedTo: 'block',
                pickAttrs: ['width', 'height', 'dataSaltThumb']
              }
            }
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image](https://localhost:3000/path/to/image.jpg){width="300" height="200" data-salt-thumb=""}\n\n## head2\n\ntest2\n'
    )
  })
  it('should accept opts array', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200"></p><h2>head2</h2><p>test2</p><p><img src="https://localhost:3001/path/to/image.jpg" alt="image" width="300" height="200"></p>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            imageSalt: [
              {
                command: 'embed',
                baseURL: 'https://localhost:3000/path/to/image.jpg',
                embed: {
                  embedTo: 'block'
                }
              },
              {
                command: 'embed',
                baseURL: 'https://localhost:3001/path/to/image.jpg',
                embed: {
                  embedTo: 'block',
                  pickAttrs: ['width']
                }
              }
            ]
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image](https://localhost:3000/path/to/image.jpg){width="300" height="200"}\n\n## head2\n\ntest2\n\n![image](https://localhost:3001/path/to/image.jpg){width="300"}\n'
    )
  })
  it('should rebuild image', async () => {
    expect(
      await htmlTo(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200">{data-salt-thumb data-salt-zenn-cap="caption"}</p><h2>head2</h2><p>test2</p>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            imageSalt: {
              command: 'rebuild',
              baseURL: 'https://localhost:3000/path/to/image.jpg',
              rebuild: {
                keepBaseURL: true
              }
            }
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n[![image](https://localhost:3000/path/to/image.jpg)*caption*](https://localhost:3000/path/to/image.jpg)\n\n## head2\n\ntest2\n'
    )
  })
  it('should not normalize unusual space chars', async () => {
    expect(
      await htmlTo(
        '<p>test1 \u00a0 \u00a0test1</p><pre><code> \u00a0 \u00a0test2</code></pre>',
        {
          convert: 'markdown',
          toMarkdownOpts: {}
        }
      )
    ).toEqual('test1 \u00a0 \u00a0test1\n\n     \u00a0 \u00a0test2\n')
  })
  it('should throw error by unusual space chars', async () => {
    await expect(
      htmlTo(
        '<p>test1 \u00a0 \u00a0test1</p><pre><code> \u00a0 \u00a0test2</code></pre>',
        {
          convert: 'markdown',
          toMarkdownOpts: { unusualSpaceChars: 'throw' }
        }
      )
    ).rejects.toThrowError(/Unusual/)
  })
  it('should normalize unusual space chars', async () => {
    expect(
      await htmlTo(
        '<p>test1 \u00a0 \u00a0test1</p><pre><code> \u00a0 \u00a0test2</code></pre>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            unusualSpaceChars: 'normalize'
          }
        }
      )
    ).toEqual('test1    test1\n\n        test2\n') // rehype で text ノードを編集しているので空白はそのまま残る.
  })
  it('should normalize unusual space chars in code block', async () => {
    expect(
      await htmlTo(
        '<p>test1 \u00a0 \u00a0test1</p><pre><code> \u00a0 \u00a0test2</code></pre>',
        {
          convert: 'markdown',
          toMarkdownOpts: {
            unusualSpaceChars: 'normalizeInCodeBlock'
          }
        }
      )
    ).toEqual('test1 \u00a0 \u00a0test1\n\n        test2\n')
  })
  it('should convert text directive', async () => {
    expect(
      await htmlTo('<p>test:dir{#id}test</p>', {
        convert: 'markdown'
      })
    ).toEqual('test:dir{#id}test\n')
    expect(
      await htmlTo('<p>test:dir{id=id}test</p>', {
        convert: 'markdown'
      })
    ).toEqual('test:dir{#id}test\n')
  })
  it('should escape bracket with default settings', async () => {
    expect(
      await htmlTo('<p>123[^abc]456</p><p>[^abc]: note</p>', {
        convert: 'markdown'
      })
    ).toEqual('123\\[^abc]456\n\n\\[^abc]: note\n')
  })
  it('should not escape bracket(footnote)', async () => {
    expect(
      await htmlTo('<p>123[^abc]456</p><p>[^abc]: note</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123[^abc]456\n\n[^abc]: note\n')
  })
  it('should not escape bracket(inline footnote)', async () => {
    expect(
      await htmlTo('<p>123^[abc]456</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123^[abc]456\n')
  })
  it('should not escape bracket(link definition)', async () => {
    expect(
      await htmlTo('<p>123[link]456</p><p>[link]: https://github.com</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123[link]456\n\n[link]: https://github.com\n')
  })
  it('should not escape bracket(directive)', async () => {
    expect(
      await htmlTo('<p>123:abc[efg]456</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123:abc[efg]456\n')
  })
  it('should not escape bracket(not text)', async () => {
    expect(
      await htmlTo('<p>123<code>[efg]</code>456</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123`[efg]`456\n')
    expect(
      await htmlTo('<p>123<code>[efg]</code>456</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123`[efg]`456\n')
  })
  it('should keep backslash before bracket', async () => {
    expect(
      await htmlTo('<p>123\\[^abc]456</p><p>[^abc]: note</p>', {
        convert: 'markdown',
        toMarkdownOpts: { unescapeBracket: true }
      })
    ).toEqual('123\\[^abc]456\n\n[^abc]: note\n')
  })
})
