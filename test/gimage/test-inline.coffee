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

        it 'should parse inline gimage notation (no link for the image)', ->
            i = """
hoge[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:50]foo

[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge<img src="http://exapmle.com/s50/test.jpg" alt="" />foo</p>

"""

        it 'should ignore position', ->
            i = """
hoge[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:50,center]foo

[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge<img src="http://exapmle.com/s50/test.jpg" alt="" />foo</p>

"""

        it 'should ignore frame size', ->
            i = """
hoge[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:50,100]foo

[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge<img src="http://exapmle.com/s50/test.jpg" alt="" />foo</p>

"""

        it 'should work inside h4', ->
            i = """
*hoge[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:50]foo

[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<h4 class="bhm">hoge<img src="http://exapmle.com/s50/test.jpg" alt="" />foo</h4>

"""

        it 'should recognize alt', ->
            i = """
hoge[gimage:2bbedba7-4c89-3d04-27d4-98d2c5891520:50,My hoge]foo

[alias:2bbedba7-4c89-3d04-27d4-98d2c5891520:http://exapmle.com/s1200/test.jpg]
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p>hoge<img src="http://exapmle.com/s50/test.jpg" alt="My hoge" />foo</p>

"""
