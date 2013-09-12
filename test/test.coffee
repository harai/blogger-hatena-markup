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
<h4 class="emeb">はてな記法JavaScript</h4>
<p>はてな記法ワープロは JavaScript ならではの利点を生かしたダイナミックなワープロです。</p>

<p>試しに色々入力してみてください。即座に出力画面が反映されます<span class="footnote"><a href="#f1" title="Windows 版 IE6 および Firefox 1.0 でのみ確認しています" name="fn1">*1</a></span>。</p>

<p>はてな記法の変換は <a href="http://search.cpan.org/dist/Text-Hatena/">Text::Hatena</a> を JavaScript に移植した "text-hatena.js" を活用しています。</p>

<h4 class="emeb">変更履歴</h4>
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
<h4 class="emeb">Metasyntactic Variables</h4>
<ol>
    <li>Japanese
        <ul>
            <li>Hoge</li>
            <li>Huga</li>
        </ul>
    </li>
    <li>English
        <ul>
            <li>Foo</li>
            <li>Bar</li>
        </ul>
    </li>
</ol>
"""

        it 'should parse quotation notation', ->
            i = """
>https://en.wikipedia.org/wiki/Thomas_Hobbes:Thomas Hobbes>
the life of man, solitary, poor, nasty, brutish, and short
<<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote title="Thomas Hobbes" cite="https://en.wikipedia.org/wiki/Thomas_Hobbes">
    <p>the life of man, solitary, poor, nasty, brutish, and short</p>
    <cite><a href="https://en.wikipedia.org/wiki/Thomas_Hobbes">Thomas Hobbes</a></cite>
</blockquote>
"""

        it 'should parse pre notation', ->
            i = """
>|
the life of man, solitary, poor, nasty, <strong>brutish</strong>, and short
|<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
the life of man, solitary, poor, nasty, <strong>brutish</strong>, and short
</pre>
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
<pre class="prettyprint lang-rb">
def hoge
  puts 'foobar'
end
</pre>
"""

        it 'should parse code with parens', ->
            i = """
>|js|
function hoge() {
    return ((a && b) || (b && c));
}
||<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre class="prettyprint lang-js">
function hoge() {
    return ((a &amp;&amp; b) || (b &amp;&amp; c));
}
</pre>
"""

        it 'should parse no-tag notation', ->
            i = """
abc

><div class="foo">hoge</div><

def
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>abc</p>

<div class="foo">hoge</div>

<p>def</p>
"""

        it 'should parse link notation', ->
            i = """
This project is hosted on [https://github.com/harai/blogger-hatena-markup:GitHub].
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>This project is hosted on <a href="https://github.com/harai/blogger-hatena-markup">GitHub</a>.</p>
"""

        it 'should parse link without title', ->
            i = """
This project is hosted on [https://github.com/harai/blogger-hatena-markup].
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>This project is hosted on <a href="https://github.com/harai/blogger-hatena-markup">https://github.com/harai/blogger-hatena-markup</a>.</p>
"""

        it 'should parse link without title, ended with :', ->
            i = """
This project is hosted on [https://github.com/harai/blogger-hatena-markup:].
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>This project is hosted on <a href="https://github.com/harai/blogger-hatena-markup">https://github.com/harai/blogger-hatena-markup</a>.</p>
"""

        it 'should parse link with title containing :', ->
            i = """
This project is hosted on [https://github.com/harai/blogger-hatena-markup:Text::Hatena].
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>This project is hosted on <a href="https://github.com/harai/blogger-hatena-markup">Text::Hatena</a>.</p>
"""

        it 'should parse more', ->
            i = """
hoge
===
foo bar
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>
<!-- more -->
<!--emPreview--><div class="previewOnly">&lt;!-- more --&gt;</div><!--/emPreview-->
<p>foo bar</p>
"""

        it 'should recognize == as normal text', ->
            i = """
hoge
==
foo bar
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>
<p>==</p>
<p>foo bar</p>
"""

        it 'should recognize indented == as normal text', ->
            i = """
hoge
 ===
foo bar
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>
<p> ===</p>
<p>foo bar</p>
"""

        it 'should parse repeated = as "more"', ->
            i = """
hoge
==================
foo bar
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>
<!-- more -->
<!--emPreview--><div class="previewOnly">&lt;!-- more --&gt;</div><!--/emPreview-->
<p>foo bar</p>
"""

        it 'should output without indent inside Tag notation', ->
            i = """
><pre>
ahya
</pre><
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
ahya
</pre>
"""

        it 'should output MathJax script inline', ->
            i = """
A [tex:\\LaTeX] document.
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>A <script type="math/tex">\\LaTeX</script> document.</p>
"""

        it 'should output MathJax script as a block', ->
            i = """
The following formula:
[tex:3x^2]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>The following formula:</p>
<script type="math/tex; mode=display">3x^2</script>
"""

        it 'should avoid XSS-like problem', ->
            i = """
[tex:</script>]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<script type="math/tex; mode=display"></scri pt></script>
"""
