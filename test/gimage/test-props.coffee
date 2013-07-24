jsdom = require("jsdom").jsdom
doc = jsdom "<html><head></head><body></body></html>"
assert = require("chai").assert

require "../../src/hatena-markup"

describe 'Hatena', ->
    describe '#parse()', ->
        h = null
        parse = (str) -> h.parse str

        beforeEach ->
            h = new Hatena(doc: doc)

        it 'should parse center gimage', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 320px;">
    <div class="emebImage"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
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

<figure class="emebLeft" style="width: 320px;">
    <div class="emebImage"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
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

<figure class="emebRight" style="width: 320px;">
    <div class="emebImage"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should parse center gimage with alt', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center,My Alt]

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 320px;">
    <div class="emebImage"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="My Alt" /></a></div>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with frame position, size and alt', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center,My Alt,360]

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 360px;">
    <div class="emebImage"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="My Alt" /></a></div>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with frame position, size, and alt - 2', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:center,My Alt,360,320]

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 360px;">
    <div class="emebImage"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="My Alt" /></a></div>
</figure>

<p>foo</p>

"""

        it 'should parse gimage with frame position, size, and caption named the same as a position', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:360, left,center,320]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 360px;">
    <div class="emebImage"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt=" left" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should recognize a number with whitespace as an alt value', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520: 360,center,320]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 320px;">
    <div class="emebImage"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt=" 360" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""

        it 'should allow an alt value including colons', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520::,center,320]
Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure class="emebCenter" style="width: 320px;">
    <div class="emebImage"><a href="http://exapmle.com/s1200/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt=":" /></a></div>
    <figcaption>
        <p>Figure 1. foo bar</p>
    </figcaption>
</figure>

<p>foo</p>

"""
