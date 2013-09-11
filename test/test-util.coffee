assert = require("chai").assert

require "../src/hatena-markup"

describe 'String', ->
    describe '#_escapeUrlInsideBracket()', ->
        f = String._escapeUrlInsideBracket

        it 'should escape normal url', ->
            assert.equal f('http://example.com'), 'http://example.com'

        it 'should escape url with bracket', ->
            assert.equal f('http://example.com?[hoge]'), 'http://example.com?%5Bhoge%5D'

        it 'should escape url with a colon', ->
            assert.equal f('http://example.com?http://example.co.jp'),
                'http://example.com?http%3A//example.co.jp'

        it 'should escape url with an additional colon', ->
            assert.equal f('http://example.com?http://example.co.jp'),
                'http://example.com?http%3A//example.co.jp'

        it 'should escape url with additional colons', ->
            assert.equal f('http://example.com?http://example.co.jp?http://example.co.jp'),
                'http://example.com?http%3A//example.co.jp?http%3A//example.co.jp'
