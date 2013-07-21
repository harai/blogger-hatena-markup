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

        it 'should parse gimage notation', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s2400/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/s2400/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="" /></a></div>
</figure>

<p>foo</p>

"""

        it 'should parse inline gimage notation (no link for the image)', ->
            i = """
hoge[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320]foo

[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge<img src="http://exapmle.com/test.jpg" alt="" />foo</p>

"""

        it 'should parse center gimage with caption', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse left gimage with caption', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,left]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: left; float: left; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse right gimage with caption', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,right]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: right; float: right; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with multi-paragraph caption', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]
Figure 1. foo bar
second paragraph

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
        <p>second paragraph</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse center gimage with caption and alt', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center,My Alt]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="My Alt" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with frame position, size, caption, and alt', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center,My Alt,360]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 360px;">
    <div style="text-align: center;"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="My Alt" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with frame position, size, caption, and alt 2', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:360,center,My Alt,320]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 360px;">
    <div style="text-align: center;"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="My Alt" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with frame position, size, caption, and alt 2', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:360,center,My Alt,320]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 360px;">
    <div style="text-align: center;"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="My Alt" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""
