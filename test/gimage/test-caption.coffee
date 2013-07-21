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

        it 'should ignore a caption of h4', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]
*Figure 1. foo bar

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
</figure>
<h4>Figure 1. foo bar</h4>

<p>foo</p>

"""

        it 'should ignore a caption of blockquote', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320,center]
>>
Figure 1. foo bar
<<

foo
[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/test.jpg]

"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<figure style="clear: both; margin-left: auto; margin-right: auto; width: 320px;">
    <div style="text-align: center;"><a href="http://exapmle.com/test.jpg"><img src="http://exapmle.com/test.jpg" alt="" /></a></div>
</figure>
<blockquote>
    <p>Figure 1. foo bar</p>
</blockquote>

<p>foo</p>

"""
