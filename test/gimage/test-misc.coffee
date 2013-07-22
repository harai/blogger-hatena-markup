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

<figure class="bhmCenter" style="width: 320px;">
    <div class="bhmImage"><a href="http://exapmle.com/s2400/test.jpg"><img src="http://exapmle.com/s320/test.jpg" alt="" /></a></div>
</figure>

<p>foo</p>

"""

        it 'should output gimage without referent as it is', ->
            i = """
hoge

[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320]

foo
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge</p>

<p>[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:320]</p>

<p>foo</p>
"""
