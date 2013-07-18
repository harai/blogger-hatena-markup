jsdom = require("jsdom").jsdom
doc = jsdom "<html><head></head><body></body></html>"
assert = require("chai").assert

require "../src/hatena-markup"

describe 'Hatena', ->
    describe '#parse()', ->
        h = null
        parse = (str) -> h.parse str

        beforeEach ->
            h = new Hatena(doc: doc)

        it 'should parse normal markup', ->
            i = """
*はてな記法JavaScript
はてな記法ワープロは JavaScript ならではの利点を生かしたダイナミックなワープロです。

試しに色々入力してみてください。即座に出力画面が反映されます((Windows 版 IE6 および Firefox 1.0 でのみ確認しています))。

はてな記法の変換は <a href="http://search.cpan.org/dist/Text-Hatena/">Text::Hatena</a> を JavaScript に移植した "text-hatena.js" を活用しています。

*変更履歴
|*2005/12/1|ソース機能追加 (HTMLソースを表示できます)|
|*2005/11/21|はてな記法ワープロ完成|
|*2005/11/13|text-hatena.js 移植開始|
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <h4>はてな記法JavaScript</h4>
    <p>はてな記法ワープロは JavaScript ならではの利点を生かしたダイナミックなワープロです。</p>
    
    <p>試しに色々入力してみてください。即座に出力画面が反映されます<span class="footnote"><a href="#f1" title="Windows 版 IE6 および Firefox 1.0 でのみ確認しています" name="fn1">*1</a></span>。</p>
    
    <p>はてな記法の変換は <a href="http://search.cpan.org/dist/Text-Hatena/">Text::Hatena</a> を JavaScript に移植した "text-hatena.js" を活用しています。</p>
    
    <h4>変更履歴</h4>
    <table>
        <tr>
            <th>2005/12/1</th>
            <td>ソース機能追加 (HTMLソースを表示できます)</td>
        </tr>
        <tr>
            <th>2005/11/21</th>
            <td>はてな記法ワープロ完成</td>
        </tr>
        <tr>
            <th>2005/11/13</th>
            <td>text-hatena.js 移植開始</td>
        </tr>
    </table>
</div>
<div class="footnote">
    <p class="footnote"><a href="#fn1" name="f1">*1</a>: Windows 版 IE6 および Firefox 1.0 でのみ確認しています</p>
</div>
"""

        it 'should parse minus list notation', ->
            i = """
*Metasyntactic Variables
+Japanese
--Hoge
--Huga
+English
--Foo
--Bar
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <h4>Metasyntactic Variables</h4>
    <ol>
        <li>Japanese</li>
        <ul>
            <li>Hoge</li>
            <li>Huga</li>
        </ul>
        <li>English</li>
        <ul>
            <li>Foo</li>
            <li>Bar</li>
        </ul>
    </ol>
</div>
"""

        it 'should parse quotation notation', ->
            i = """
>https://en.wikipedia.org/wiki/Thomas_Hobbes:title=Thomas Hobbes>
the life of man, solitary, poor, nasty, brutish, and short
<<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <blockquote cite="https://en.wikipedia.org/wiki/Thomas_Hobbes" title="Thomas Hobbes">
        <p>the life of man, solitary, poor, nasty, brutish, and short</p>
    <cite><a href="https://en.wikipedia.org/wiki/Thomas_Hobbes">Thomas Hobbes</a></cite></blockquote>
</div>
"""

        it 'should parse pre notation', ->
            i = """
>|
the life of man, solitary, poor, nasty, <strong>brutish</strong>, and short
|<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <pre>
the life of man, solitary, poor, nasty, <strong>brutish</strong>, and short
</pre>
</div>
"""

        it 'should parse code notation', ->
            i = """
>|rb|
def hoge
  puts 'foobar'
end
||<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <pre class="prettyprint rb">
def hoge
  puts &#39foobar&#39
end
</pre>
</div>
"""

        it 'should parse no-tag notation', ->
            i = """
abc

><div class="foo">hoge</div><

def
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <p>abc</p>
    
    <div class="foo">hoge</div>
    
    <p>def</p>
</div>
"""

        it 'should parse link notation', ->
            i = """
This project is hosted on [https://github.com/harai/blogger-hatena-markup:GitHub].
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <p>This project is hosted on <a href="https://github.com/harai/blogger-hatena-markup">GitHub</a>.</p>
</div>
"""

        it 'should parse gimage notation', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div class="section">
    <p>hoge</p>
    
    <figure><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" /></a></figure>
    
    <p>foo</p>
    
</div>
"""
