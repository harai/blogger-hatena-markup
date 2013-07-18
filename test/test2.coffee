# Tests copied from here:
#
# Junya Kondo / Text-Hatena - search.cpan.org
# http://search.cpan.org/dist/Text-Hatena/

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

        it 'h4', ->
            i = """
*Hello, World!
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<h4>Hello, World!</h4>
"""
        it 'h4_2', ->
            i = """
*Hello, World!
This is Text::Hatena.
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<h4>Hello, World!</h4>
<p>This is Text::Hatena.</p>
"""
        it 'h4_3', ->
            i = """ *Hello, World!
This is Text::Hatena.
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p> *Hello, World!</p>
<p>This is Text::Hatena.</p>
"""
        it 'h4_4', ->
            i = """
*Good morning

It's morning.

*Good afternoon

Beautiful day!
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<h4>Good morning</h4>

<p>It's morning.</p>

<h4>Good afternoon</h4>

<p>Beautiful day!</p>
"""
        it 'h5', ->
            i = """
**Hello, Japan!

This is Text::Hatena.
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<h5>Hello, Japan!</h5>

<p>This is Text::Hatena.</p>
"""
        it 'h6', ->
            i = """
***Hello, Tokyo!

This is Text::Hatena.
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<h6>Hello, Tokyo!</h6>

<p>This is Text::Hatena.</p>
"""
        it 'blockquote', ->
            i = """
>>
quoted
<<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote>
    <p>quoted</p>
</blockquote>
"""
        it 'blockquote2', ->
            i = """
>>
quoted
>>
quoted quoted
<<
<<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote>
    <p>quoted</p>
    <blockquote>
        <p>quoted quoted</p>
    </blockquote>
</blockquote>
"""
        it 'blockquote3', ->
            i = """ >>\n unquoted\n <<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<p> >></p>
<p> unquoted</p>
<p> <<</p>
"""
        it 'blockquote4', ->
            i = """
>http://www.hatena.ne.jp/>
Hatena
<<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote title="http://www.hatena.ne.jp/" cite="http://www.hatena.ne.jp/">
    <p>Hatena</p>
    <cite><a href="http://www.hatena.ne.jp/">http://www.hatena.ne.jp/</a></cite>
</blockquote>
"""
        it 'blockquote5', ->
            i = """
>http://www.hatena.ne.jp/:Hatena>
Hatena
<<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote title="Hatena" cite="http://www.hatena.ne.jp/">
    <p>Hatena</p>
    <cite><a href="http://www.hatena.ne.jp/">Hatena</a></cite>
</blockquote>
"""
        it 'dl', ->
            i = """
:cinnamon:dog
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<dl>
    <dt>cinnamon</dt>
    <dd>dog</dd>
</dl>
"""
        it 'dl2', ->
            i = """
:cinnamon:dog
:tama:cat
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<dl>
    <dt>cinnamon</dt>
    <dd>dog</dd>
    <dt>tama</dt>
    <dd>cat</dd>
</dl>
"""
        it 'ul', ->
            i = """
-komono
-kyoto
-shibuya
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li>komono</li>
    <li>kyoto</li>
    <li>shibuya</li>
</ul>
"""
        it 'ul2', ->
            i = """
-komono
--kyoto
---shibuya
--hachiyama
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li>komono
        <ul>
            <li>kyoto
                <ul>
                    <li>shibuya</li>
                </ul>
            </li>
            <li>hachiyama</li>
        </ul>
    </li>
</ul>
"""
        it 'ul3', ->
            i = """
-list
--ul
--ol
-pre
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li>list
        <ul>
            <li>ul</li>
            <li>ol</li>
        </ul>
    </li>
    <li>pre</li>
</ul>
"""
        it 'ul4', ->
            i = " - wrong list\n - what's happen?"
            # console.log(parse(i))
            assert.equal parse(i), """
<p> - wrong list</p>
<p> - what's happen?</p>
"""
        it 'ul5', ->
            i = """
- right list
 - wrong list
 - what's happen?
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li> right list</li>
</ul>
<p> - wrong list</p>
<p> - what's happen?</p>
"""
        it 'ul6', ->
            i = """
-Japan
--Kyoto
--Tokyo
-USA
--Mountain View
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li>Japan
        <ul>
            <li>Kyoto</li>
            <li>Tokyo</li>
        </ul>
    </li>
    <li>USA
        <ul>
            <li>Mountain View</li>
        </ul>
    </li>
</ul>
"""
        it 'ul7', ->
            i = """
-komono
--kyoto
---shibuya
--hachiyama
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li>komono
        <ul>
            <li>kyoto
                <ul>
                    <li>shibuya</li>
                </ul>
            </li>
            <li>hachiyama</li>
        </ul>
    </li>
</ul>
"""
        it 'ol', ->
            i = """
+Register
+Login
+Write your blog
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ol>
    <li>Register</li>
    <li>Login</li>
    <li>Write your blog</li>
</ol>
"""
        it 'ol2', ->
            i = """
-Steps
++Register
++Login
++Write your blog
-Option
--180pt
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<ul>
    <li>Steps
        <ol>
            <li>Register</li>
            <li>Login</li>
            <li>Write your blog</li>
        </ol>
    </li>
    <li>Option
        <ul>
            <li>180pt</li>
        </ul>
    </li>
</ul>
"""
        it 'super_pre', ->
            i = """
>||
#!/usr/bin/perl

my $url = 'http://d.hatena.ne.jp/';
||<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
#!/usr/bin/perl

my $url = 'http://d.hatena.ne.jp/';
</pre>
"""
        # it 'super_pre_fail', ->
            # i = """
# >||
# #!/usr/bin/perl
# 
# my $name = 'jkondo'||<
# """
            # # console.log(parse(i))
            # assert.equal parse(i), """
# # <p>>||</p>
# <p>#!/usr/bin/perl</p>
# 
# <p>my $name = 'jkondo'||<</p>
# </div>
# """
        it 'super_pre2', ->
            i = """
>|perl|
#!/usr/bin/perl

my $url = 'http://d.hatena.ne.jp/';
||<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre class="prettyprint perl">
#!/usr/bin/perl

my $url = 'http://d.hatena.ne.jp/';
</pre>
"""
        it 'super_pre3', ->
            i = """
>||
>>
unquoted
<<
- unlisted
http://www.hatena.com/ unanchored.
||<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
&gt;&gt;
unquoted
&lt;&lt;
- unlisted
http://www.hatena.com/ unanchored.
</pre>
"""
        it 'super_pre4', ->
            i = """
>||
>>
unquoted
<<
- unlisted
http://www.hatena.com/ unanchored.
<a href="http://www.hatena.com/">escaped tags</a>
||<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
&gt;&gt;
unquoted
&lt;&lt;
- unlisted
http://www.hatena.com/ unanchored.
&lt;a href="http://www.hatena.com/"&gt;escaped tags&lt;/a&gt;
</pre>
"""
        it 'pre', ->
            i = """
>|
#!/usr/bin/perl
use strict;
use warnings;

say 'Hello, World!';
|<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
#!/usr/bin/perl
use strict;
use warnings;

say 'Hello, World!';
</pre>
"""
        it 'pre2', ->
            i = """
>|
To: info@test.com
Subject: This is Test.

Hello, This is test from Text::Hatena.
 Don't reply to this email.

--
jkondo
|<
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<pre>
To: info@test.com
Subject: This is Test.

Hello, This is test from Text::Hatena.
 Don't reply to this email.

--
jkondo
</pre>
"""
        it 'table', ->
            i = """
|*Lang|*Module|
|Perl|Text::Hatena|
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<table>
    <tr>
        <th>Lang</th>
        <th>Module</th>
    </tr>
    <tr>
        <td>Perl</td>
        <td>Text::Hatena</td>
    </tr>
</table>
"""
        it 'cdata', ->
            i = """
><div>no paragraph line</div><
paragraph line
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<div>no paragraph line</div>
<p>paragraph line</p>
"""
        it 'cdata2', ->
            i = """
><blockquote>
<p>Hello I am writing HTML tags by myself</p>
</blockquote><
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote>
    <p>Hello I am writing HTML tags by myself</p>
</blockquote>
"""
        it 'cdata3', ->
            i = """
><blockquote><
Please add p tags for me.
It's candy blockquote.
></blockquote><
"""
            # console.log(parse(i))
            assert.equal parse(i), """
<blockquote>
<p>Please add p tags for me.</p>
<p>It's candy blockquote.</p>
</blockquote>
"""
