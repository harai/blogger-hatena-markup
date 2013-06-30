// ==UserScript==
// @name           Blogger Hatena Markup
// @namespace      https://github.com/harai/
// @description    Hatena Markup for Blogger
// @include        http://www.blogger.com/blogger.g*
// ==/UserScript==
//
//  Copyright (C) 2013 Akihiro HARAI
//  Originally created by edvakf
//
//   The JavaScript code in this page is free software: you can
//   redistribute it and/or modify it under the terms of the GNU
//   General Public License (GNU GPL) as published by the Free Software
//   Foundation, either version 3 of the License, or (at your option)
//   any later version.  The code is distributed WITHOUT ANY WARRANTY;
//   without even the implied warranty of MERCHANTABILITY or FITNESS
//   FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
//
//   As additional permission under GNU GPL version 3 section 7, you
//   may distribute non-source (e.g., minimized or compacted) forms of
//   that code without the copy of the GNU GPL normally required by
//   section 4, provided you include this license notice and a URL
//   through which recipients can access the Corresponding Source.
//
// This script makes use of:
//   text-hatena.js 
//     http://tech.nitoyon.com/javascript/application/texthatena/download.html
//   SHJS 
//     http://shjs.sourceforge.net/
//
// Syntax-highlightable languages:
//   C (c), C++ (cpp), CSS (css), diff (diff), HTML (html), Java (java), 
//   JavaScript (javascript), Perl (perl), PHP (php), Python (python),
//   Ruby (ruby), Scala (scala), Shell Script (sh), SQL (sql), XML (xml)

/*
 * http://tech.nitoyon.com/javascript/application/texthatena/text-hatena0-2.js
 * modified by edvakf
 */

// from prototype.js
Object.extend = function(destination, source) {
  for (property in source) {
	destination[property] = source[property];
  }
  return destination;
}

String.times = function(str, time){
	var s = "";
	for(var i = 0; i < time; i++)s += str;
	return s;
}

String._escapeHTML = function(s){
	s = s.replace(/\&/g, "&amp;");
	s = s.replace(/</g, "&lt;");
	s = s.replace(/>/g, "&gt;");
	s = s.replace(/"/g, "&quot;");
	s = s.replace(/\'/g, "&#39");
	s = s.replace(/\\/g, "&#92");
	return s;
}

String._unescapeHTML = function(s){
	s = s.replace(/&amp;/g, "&");
	s = s.replace(/&lt;/g, "<");
	s = s.replace(/&gt;/g, ">");
	s = s.replace(/&quot;/g, "\"");
	return s;
}


// Hatena::Hatena_HTMLFilter
Hatena_HTMLFilter = function(args){
	this.self = {
		context : args["context"],
		html : ''
	};
	this.init();
}
Hatena_HTMLFilter.prototype = {
	init :function(){
		// HTML::Parser を利用すべきなんだけど JavaScript ではなんとも...
	},

	parse : function(html){
		var c = this.self.context;
		this.self.html = c.self.texthandler(html, c);
	},

	html : function(){
		return this.self.html;
	}
}


// Hatena
Hatena = function(args){
	if(args == null) args = {};
	this.self = {
		html : '',
		baseuri : args["baseuri"],
		permalink : args["permalink"] || "",
		ilevel : args["ilevel"] || 0,
		invalidnode : args["invalidnode"] || [],
		sectionanchor : args["sectionanchor"] || 'o-',
		texthandler : args["texthandler"] || function(text, c){
			// footnote
			var p = c.self.permalink;
			var html = "";
			var foot = text.split("((");
			for(var i = 0; i < foot.length; i++){
				if(i == 0){
					html += foot[i];
					continue;
				}
				var s = foot[i].split("))", 2);
				if(s.length != 2){
					html += "((" + foot[i];
					continue;
				}
				var pre = foot[i - i];
				var note = s[0];
				var post = foot[i].substr(s[0].length + 2);
				if(pre.match(/\)$/) && post.match(/^\(/)){
					html += "((" + post;
				} else {
					var notes = c.footnotes(note);
					var num = notes.length;
					note = note.replace(/<.*?>/g, "");
					note = note.replace(/&/g, "&amp;");
					html += '<span class="footnote"><a href="' + p + '#f' + num + '" title="' + note + '" name="fn' + num + '">*' + num + '</a></span>' + post;
				}
			}
			// auto link (added by edvakf)
			html = html.replace(/\[(https?:\/\/[^\]\s]+?)(:title(=[^\]\n]*)?)?\]/g, function($0,$1,$2,$3) {
				return '<a href="' + String._escapeHTML($1) + '">' + (
					$3 ? String._escapeHTML($3.slice(1)) :          // title given by user
					$2 ? '{{title}}' : // title will be fetched (via YQL)
					$1                 // use URL instead of title
				) + '</a>';
			});
			return html;
		}
	};
}
Hatena.prototype = {
	parse : function(text){
		this.self.context = new Hatena_Context({
			text : text || "",
			baseuri : this.self.baseuri,
			permalink : this.self.permalink,
			invalidnode : this.self.invalidnode,
			sectionanchor : this.self.sectionanchor,
			texthandler : this.self.texthandler
		});
		var c = this.self.context;
		var node = new Hatena_BodyNode();
		node._new({
			context : c,
			ilevel : this.self.ilevel
		});
		node.parse();
		var parser = new Hatena_HTMLFilter({
			context : c
		});
		parser.parse(c.html());
		this.self.html = parser.html();

		if (this.self.context.footnotes().length != 0) {
			var node = new Hatena_FootnoteNode();
			node._new({
				context : this.self.context,
				ilevel : this.self.ilevel
			});
			node.parse();
			this.self.html += "\n";
			this.self.html += node.self.html;
		}
	}, 

	html : function(){
		return this.self.html;
	}
}


// Hatena::Context
Hatena_Context = function(args){
	this.self = {
		text : args["text"],
		baseuri : args["baseuri"],
		permalink : args["permalink"],
		invalidnode : args["invalidnode"],
		sectionanchor : args["sectionanchor"],
		texthandler : args["texthandler"],
		_htmllines : [],
		footnotes : Array(),
		sectioncount : 0,
		syntaxrefs : [],
		noparagraph : 0
	};
	this.init();
}
Hatena_Context.prototype = {
	init : function() {
		this.self.text = this.self.text.replace(/\r/g, "");
		this.self.lines = this.self.text.split('\n');
		this.self.index = -1;
	},

	hasnext : function() {
		return (this.self.lines != null && this.self.lines.length - 1 > this.self.index);
	},

	nextline : function() {
		return this.self.lines[this.self.index + 1];
	},

	shiftline : function() {
		return this.self.lines[++this.self.index];
	},

	currentline : function() {
		return this.self.lines[this.self.index];
	},

	html : function() {
		return this.self._htmllines.join ("\n");
	},

	htmllines : function(line) {
		if(line != null) this.self._htmllines.push(line);
		return this.self._htmllines;
	},

	lasthtmlline : function() {return this.self._htmllines[this.self._htmllines.length - 1]; },

	footnotes : function(line) {
		if(line != null) this.self.footnotes.push(line);
		return this.self.footnotes;
	},

	syntaxrefs : function(line) {
		if(line != null) this.self.syntaxrefs.push(line);
		return this.self.syntaxrefs;
	},

	syntaxpattern : function(pattern) {
		if(pattern != null) this.self.syntaxpattern = pattern;
		return this.self.syntaxpattern;
	},

	noparagraph : function(noparagraph) {
		if(noparagraph != null) this.self.noparagraph = noparagraph;
		return this.self.noparagraph;
	},

	incrementsection : function() {
		return this.self.sectioncount++;
	}
}


// Hatena::Node
Hatena_Node = function(){}
Hatena_Node.prototype = {
	html : "", 
	pattern : "",

	_new : function(args){
		if(args == null) args = Array();
		this.self = {
			context : args["context"],
			ilevel : args["ilevel"],
			html : ''
		};
		this.init();
	},
	init : function(){
		this.self.pattern = '';
	},

	parse : function(){ alert('die'); },

	context : function(v){
		this.self.context = v;
	}
};


// Hatena::BodyNode
Hatena_BodyNode = function(){};
Hatena_BodyNode.prototype = Object.extend(new Hatena_Node(), {
	parse : function(){
		var c = this.self.context;
		while (this.self.context.hasnext()) {
			var node = new Hatena_SectionNode();
			node._new({
				context : c,
				ilevel : this.self.ilevel
			});
			node.parse();
		}
	}
})


// Hatena::BrNode
Hatena_BrNode = function(){};
Hatena_BrNode.prototype = Object.extend(new Hatena_Node(), {
	parse : function(){
		var c = this.self.context;
		var l = c.shiftline();
		if(l.length != 0) return;
		var t = String.times("\t", this.self.ilevel);
		if (c.lasthtmlline() == t + "<br>" || c.lasthtmlline() == t) {
			c.htmllines(t + "<br>");
		} else {
			c.htmllines(t);
		}
	}
})


// Hatena::CDataNode
Hatena_CDataNode = function(){};
Hatena_CDataNode.prototype = Object.extend(new Hatena_Node(), {
	parse : function(){
		var c = this.self.context;
		var t = String.times("\t", this.self.ilevel);
		var l = c.shiftline();
		var text = new Hatena_Text();
		text._new({context : c});
		text.parse(l);
		l = text.html();
		c.htmllines(t + l);
	}
})


// Hatena::DlNode
Hatena_DlNode = function(){};
Hatena_DlNode.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.pattern = /^\:((?:<[^>]+>|\[\].+?\[\]|\[[^\]]+\]|\[\]|[^\:<\[]+)+)\:(.+)$/;
	},

	parse : function(){
		var c = this.self.context;
		var l = c.nextline();
		if(!l.match(this.self.pattern)) return;
		this.self.llevel = RegExp.$1.length;
		var t = String.times("\t", this.self.ilevel);

		c.htmllines(t + "<dl>");
		while (l = c.nextline()) {
			if(!l.match(this.self.pattern)) break;
			c.shiftline();
			c.htmllines(t + "\t<dt>" + RegExp.$1 + "</dt>");
			c.htmllines(t + "\t<dd>" + RegExp.$2 + "</dd>");
		}
		c.htmllines(t + "</dl>");
	}
})


// Hatena::FootnoteNode
Hatena_FootnoteNode = function(){};
Hatena_FootnoteNode.prototype = Object.extend(new Hatena_Node(), {
	html : "",

	parse : function(){
		var c = this.self["context"];
		if(c.self.footnotes == null || c.self.footnotes.length == 0) return;
		var t = String.times("\t", this.self["ilevel"]);
		var p = c.self.permalink;
		this.self["html"] = '';

		this.self.html += t + '<div class="footnote">\n';
		var num = 0;
		var text = new Hatena_Text();
		text._new({context : c});
		for(var i = 0; i < c.self.footnotes.length; i++) {
			var note = c.self.footnotes[i];
			num++;
			text.parse(note);
			var l = t + '\t<p class="footnote"><a href="' + p + '#fn' + num + '" name="f' + num + '">*' + num + '</a>: '
				+ text.html() + '</p>';
			this.self["html"] += l + "\n";
		}
		this.self["html"] += t + '</div>\n';
	}
})


// Hatena::H3Node
Hatena_H3Node = function(){};
Hatena_H3Node.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.pattern = /^\*(?:(\d{9,10}|[a-zA-Z]\w*)\*)?((?:\[[^\:\[\]]+\])+)?(.*)$/;
	},

	parse : function(){
		var c = this.self.context;
		var l = c.shiftline();
		if(l == null) return;
		if(!l.match(this.self.pattern)) return;
		var name = RegExp.$1;
		var cat = RegExp.$2;
		var title = RegExp.$3;
		var b = c.self.baseuri;
		var p = c.self.permalink;
		var t = String.times("\t", this.self.ilevel);
		var sa = c.self.sectionanchor;

		/* TODO: カテゴリは未対応
		if (cat) {
			if(cat.match(/\[([^\:\[\]]+)\]/)){ // 繰り返しできないなぁ...
				var w = RegExp.$1;
				var ew = escape(RegExp.$1);
				cat = cat.replace(/\[([^\:\[\]]+)\]/, '[<a class="sectioncategory" href="' + b + '?word=' + ew + '">' + w + '</a>]');
			}
		}*/
		var extra = '';
		var ret = this._formatname(name);
		var name = (ret[0] != undefined ? ret[0] : ""); extra = (ret[1] != undefined ? ret[1] : "");
		c.htmllines(t + '<h3><a href="' + p + '#' + name + '" name="' + name + '"><span class="sanchor">' + sa + '</span></a> ' + cat + title + '</h3>' + extra);
	},

	_formatname : function(name){
		/* TODO: 時間も未対応。表示時の時間が表示されてしまう...
		if (name && name.match(/^\d{9,10}$/)) {
			var m = sprintf('%02d', (localtime($name))[1]);
			var h = sprintf('%02d', (localtime($name))[2]);
			return (
				$name,
				qq| <span class="timestamp">$h:$m</span>|,
			);
		} elsif ($name) {*/
		if(name != ""){
			return [name];
		} else {
			this.self.context.incrementsection();
			name = 'p' + this.self.context.self.sectioncount;
			return [name];
		}
	}
})


// Hatena::H4Node
Hatena_H4Node = function(){};
Hatena_H4Node.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.pattern = /^\*\*((?:[^\*]).*)$/;
	},

	parse : function(){
		var c = this.self.context;
		var l = c.shiftline();
		if(l == null) return;
		if(!l.match(this.self.pattern)) return;
		var t = String.times("\t", this.self.ilevel);
		c.htmllines(t + "<h4>" + RegExp.$1 + "</h4>");
	}
})


// Hatena::H5Node
Hatena_H5Node = function(){};
Hatena_H5Node.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.pattern = /^\*\*\*((?:[^\*]).*)$/;
	},

	parse : function(){
		var c = this.self.context;
		var l = c.shiftline();
		if(l == null) return;
		if(!l.match(this.self.pattern)) return;
		var t = String.times("\t", this.self.ilevel);
		c.htmllines(t + "<h5>" + RegExp.$1 + "</h5>");
	}
})


// Hatena::ListNode
Hatena_ListNode = function(){};
Hatena_ListNode.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.pattern = /^([\-\+]+)([^>\-\+].*)$/;
	},

	parse : function(){
		var c = this.self.context;
		var l = c.nextline();
		if(!l.match(this.self.pattern)) return;
		this.self.llevel = RegExp.$1.length;
		var t = String.times("\t", this.self.ilevel + this.self.llevel - 1);
		this.self.type = RegExp.$1.substr(0, 1) == '-' ? 'ul' : 'ol';

		c.htmllines(t + "<" + this.self.type + ">");
		while (l = c.nextline()) {
			if(!l.match(this.self.pattern)) break;
			if (RegExp.$1.length > this.self.llevel) {
				//c.htmllines(t + "\t<li>"); bug??
				var node = new Hatena_ListNode();
				node._new({
					context : this.self.context,
					ilevel : this.self.ilevel
				});
				node.parse();
				//c.htmllines(t + "\t</li>"); bug??
			} else if(RegExp.$1.length < this.self.llevel) {
				break;
			} else {
				l = c.shiftline();
				c.htmllines(t + "\t<li>" + RegExp.$2 + "</li>");
			}
		}
		c.htmllines(t + "</" + this.self.type + ">");
	}
})


// Hatena::PNode
Hatena_PNode = function(){};
Hatena_PNode.prototype = Object.extend(new Hatena_Node(), {
	parse :function(){
		var c = this.self.context;
		var t = String.times("\t", this.self.ilevel);
		var l = c.shiftline();
		var text = new Hatena_Text();
		text._new({context : c});
		text.parse(l);
		l = text.html();
		c.htmllines(t + "<p>" + l + "</p>");
	}
});


// Hatena::PreNode
Hatena_PreNode = function(){};
Hatena_PreNode.prototype = Object.extend(new Hatena_Node(), {
	init :function(){
		this.self.pattern = /^>\|$/;
		this.self.endpattern = /(.*)\|<$/;
		this.self.startstring = "<pre>";
		this.self.endstring = "</pre>";
	},

	parse : function(){ // modified by edvakf
		var c = this.self.context;
		var m;
		if(!(m = c.nextline().match(this.self.pattern))) return;
		c.shiftline();
		var t = String.times("\t", this.self.ilevel);
		c.htmllines(t + (m[1] ? 
			// add class for syntax highlight
			this.self.startstring.replace('>',' class="sh_' + m[1] + '">') :
			this.self.startstring));
		var x = '';
		while (c.hasnext()) {
			var l = c.nextline();
			if (l.match(this.self.endpattern)) {
				var x = RegExp.$1;
				c.shiftline();
				break;
			}
			c.htmllines(this.escape_pre(c.shiftline()));
		}
		c.htmllines(x + this.self.endstring);
	},

	escape_pre : function(text){ return text; }
})


// Hatena::SuperpreNode
Hatena_SuperpreNode = function(){};
Hatena_SuperpreNode.prototype = Object.extend(new Hatena_PreNode(), {
	init : function(){
		this.self.pattern = /^>\|(\S*)\|$/; // modified by edvakf
		this.self.endpattern = /^\|\|<$/;
		this.self.startstring = "<pre>";
		this.self.endstring = "</pre>";
	},

	escape_pre : function(s){
		return String._escapeHTML(s);
	}
})


// Hatena::SuperpreNode
Hatena_TableNode = function(){};
Hatena_TableNode.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.pattern = /^\|([^\|]*\|(?:[^\|]*\|)+)$/;
	},

	parse : function(s){
		var c = this.self.context;
		var l = c.nextline();
		if(!l.match(this.self.pattern)) return;
		var t = String.times("\t", this.self.ilevel);

		c.htmllines(t + "<table>");
		while (l = c.nextline()) {
			if(!l.match(this.self.pattern)) break;
			l = c.shiftline();
			c.htmllines(t + "\t<tr>");
			var td = l.split("|");
			td.pop(); td.shift();
			for (var i = 0; i < td.length; i++) {
				var item = td[i];
				if (item.match(/^\*(.*)/)) {
					c.htmllines(t + "\t\t<th>" + RegExp.$1 + "</th>");
				} else {
					c.htmllines(t + "\t\t<td>" + item + "</td>");
				}
			}
			c.htmllines(t + "\t</tr>");
		}
		c.htmllines(t + "</table>");
	}
})


// Hatena::Section
Hatena_SectionNode = function(){};
Hatena_SectionNode.prototype = Object.extend(new Hatena_Node(), {
	init : function(){
		this.self.childnode = ["h5", "h4", "h3", "blockquote", "dl", "list", "pre", "superpre", "table", "tagline", "tag"];
		this.self.startstring = '<div class="section">';
		this.self.endstring = '</div>';
		this.self.child_node_refs = Array();
	},

	parse : function(){
		var c = this.self.context;
		var t = String.times("\t", this.self.ilevel);
		this._set_child_node_refs();
		c.htmllines(t + this.self.startstring);
		while (c.hasnext()) {
			var l = c.nextline();
			var node = this._findnode(l);
			if(node == null) return;
			// TODO: ref == instanceof ???
			//if (ref(node) eq 'Hatena_H3Node') {
			//	if(this.self.started++) break;
			//}
			node.parse();
		}
		c.htmllines(t + this.self.endstring);
	},

	_set_child_node_refs : function(){
		var c = this.self.context;
		var nodeoption = {
			context : c,
			ilevel : this.self.ilevel + 1
		};
		var invalid = Array();
		if(c.self.invalidnode) invalid[c.self.invalidnode] = Array();
		for(var i = 0; i <  this.self.childnode.length; i++) {
			var node = this.self.childnode[i];
			if(invalid[node]) continue;
			var mod = 'Hatena_' + node.charAt(0).toUpperCase() + node.substr(1).toLowerCase() + 'Node';
			var n = eval("new "+ mod +"()");
			n._new(nodeoption);
			this.self.child_node_refs.push(n);
		}
	},

	_findnode : function(l){
		for(var i = 0; i < this.self.child_node_refs.length; i++) {
			var node = this.self.child_node_refs[i];
			var pat = node.self.pattern;
			if(pat == null) continue;
			if (l.match(pat)) {
				return node;
			}
		}
		var nodeoption = {
			context : this.self.context,
			ilevel : this.self.ilevel + 1
		};
		if (l.length == 0) {
			var node = new Hatena_BrNode(nodeoption);
			node._new(nodeoption);
			return node;
		} else if (this.self.context.noparagraph()) {
			var node = new Hatena_CDataNode();
			node._new(nodeoption);
			return node;
		} else {
			var node = new Hatena_PNode;
			node._new(nodeoption);
			return node;
		}
	}
})


// Hatena::BlockquoteNode (modified by edvakf)
Hatena_BlockquoteNode = function(){};
Hatena_BlockquoteNode.prototype = Object.extend(new Hatena_SectionNode(), {
	init : function(){
		this.self.pattern = /^>(?:(https?:\/\/.*?)(:title(=.+)?)?)?>$/; // modified by edvakf
		this.self.endpattern = /^<<$/;
		this.self.childnode = ["h4", "h5", "blockquote", "dl", "list", "pre", "superpre", "table"];//, "tagline", "tag"];
		this.self.startstring = "<blockquote>";
		this.self.endstring = "</blockquote>";
		this.self.child_node_refs = Array();
	},

	parse : function(){
		var c = this.self.context;
		var m;
		if(!(m = c.nextline().match(this.self.pattern))) return;
		if (m[1]) { // m[1] is the url (added by edvakf)
			var title = String._escapeHTML(m[3] ? m[3].substr(1) : // if title given, then use it
				m[2] ? '{{title}}' :  // else if title not given, fetch from YQL
				m[1]);                // else, use URL
			this.self.startstring = this.self.startstring.replace('>', ' cite="' + m[1] + '" title="' + title + '">');
			var cite = '<cite><a href="' + m[1] + '">' + title + '</a></cite>';
		} else {
			var cite = '';
		}
		c.shiftline();
		var t = String.times("\t", this.self.ilevel);
		this._set_child_node_refs();
		c.htmllines(t + this.self.startstring);
		while (c.hasnext()) {
			var l = c.nextline();
			if (l.match(this.self.endpattern)) {
				c.shiftline();
				break;
			}
			var node = this._findnode(l);
			if(node == null) break;
			node.parse();
		}
		c.htmllines(t + cite + this.self.endstring);
	}
})


// Hatena::TagNode
Hatena_TagNode = function(){};
Hatena_TagNode.prototype = Object.extend(new Hatena_SectionNode(), {
	init : function(){
		this.self.pattern = /^>(<.*)$/;
		this.self.endpattern = /^(.*>)<$/;
		this.self.childnode = ["h4", "h5", "blockquote", "dl", "list", "pre", "superpre", "table"];
		this.self.child_node_refs = Array();
	},

	parse : function(){
		var c = this.self.context;
		var t = String.times("\t", this.self.ilevel);
		if(!c.nextline().match(this.self.pattern)) return;
		c.shiftline();
		c.noparagraph(1);
		this._set_child_node_refs();
		var x =this._parse_text(RegExp.$1);
		c.htmllines(t + x);
		while (c.hasnext()) {
			var l = c.nextline();
			if (l.match(this.self.endpattern)) {
				c.shiftline();
				x = this._parse_text(RegExp.$1);
				c.htmllines(t + x);
				break;
			}
			var node = this._findnode(l);
			if(node == null) break;
			node.parse();
		}
		c.noparagraph(0);
	},

	_parse_text : function(l){
		var text = new Hatena_Text();
		text._new({context : this.self.context});
		text.parse(l);
		return text.html();
	}
})


// Hatena::TaglineNode
Hatena_TaglineNode = function(){};
Hatena_TaglineNode.prototype = Object.extend(new Hatena_SectionNode(), {
	init : function(){
		this.self.pattern = /^>(<.*>)<$/;
		this.self.child_node_refs = Array();
	},

	parse : function(){
		var c = this.self.context;
		var t = String.times("\t", this.self.ilevel);
		if(!c.nextline().match(this.self.pattern)) return;
		c.shiftline();
		c.htmllines(t + RegExp.$1);
	}
})


// Hatena::Text
Hatena_Text = function(){}
Hatena_Text.prototype = {
	_new : function(args){
		this.self = {
			context : args["context"],
			html : ''
		};
	},

	parse : function(text){
		this.self.html = '';
		if(text == null) return;
		this.self.html = text;
	},

	html : function(){return this.self.html;}
}


/*var h = new Hatena();
h.parse("hoge((a))aaa))aaaa\n><a>hoge</a><aaa");
WScript.echo(h.html());
*/

// end of text-hatena0-2.js


/*
SHJS - Syntax Highlighting in JavaScript
Copyright (C) 2007, 2008 gnombat@users.sourceforge.net
License: http://shjs.sourceforge.net/doc/gplv3.html
*/

if (! this.sh_languages) {
  this.sh_languages = {};
}
var sh_requests = {};

function sh_isEmailAddress(url) {
  if (/^mailto:/.test(url)) {
    return false;
  }
  return url.indexOf('@') !== -1;
}

function sh_setHref(tags, numTags, inputString) {
  var url = inputString.substring(tags[numTags - 2].pos, tags[numTags - 1].pos);
  if (url.length >= 2 && url.charAt(0) === '<' && url.charAt(url.length - 1) === '>') {
    url = url.substr(1, url.length - 2);
  }
  if (sh_isEmailAddress(url)) {
    url = 'mailto:' + url;
  }
  tags[numTags - 2].node.href = url;
}

/*
Konqueror has a bug where the regular expression /$/g will not match at the end
of a line more than once:

  var regex = /$/g;
  var match;

  var line = '1234567890';
  regex.lastIndex = 10;
  match = regex.exec(line);

  var line2 = 'abcde';
  regex.lastIndex = 5;
  match = regex.exec(line2);  // fails
*/
function sh_konquerorExec(s) {
  var result = [''];
  result.index = s.length;
  result.input = s;
  return result;
}

/**
Highlights all elements containing source code in a text string.  The return
value is an array of objects, each representing an HTML start or end tag.  Each
object has a property named pos, which is an integer representing the text
offset of the tag. Every start tag also has a property named node, which is the
DOM element started by the tag. End tags do not have this property.
@param  inputString  a text string
@param  language  a language definition object
@return  an array of tag objects
*/
function sh_highlightString(inputString, language) {
  if (/Konqueror/.test(navigator.userAgent)) {
    if (! language.konquered) {
      for (var s = 0; s < language.length; s++) {
        for (var p = 0; p < language[s].length; p++) {
          var r = language[s][p][0];
          if (r.source === '$') {
            r.exec = sh_konquerorExec;
          }
        }
      }
      language.konquered = true;
    }
  }

  var a = document.createElement('a');
  var span = document.createElement('span');

  // the result
  var tags = [];
  var numTags = 0;

  // each element is a pattern object from language
  var patternStack = [];

  // the current position within inputString
  var pos = 0;

  // the name of the current style, or null if there is no current style
  var currentStyle = null;

  var output = function(s, style) {
    var length = s.length;
    // this is more than just an optimization - we don't want to output empty <span></span> elements
    if (length === 0) {
      return;
    }
    if (! style) {
      var stackLength = patternStack.length;
      if (stackLength !== 0) {
        var pattern = patternStack[stackLength - 1];
        // check whether this is a state or an environment
        if (! pattern[3]) {
          // it's not a state - it's an environment; use the style for this environment
          style = pattern[1];
        }
      }
    }
    if (currentStyle !== style) {
      if (currentStyle) {
        tags[numTags++] = {pos: pos};
        if (currentStyle === 'sh_url') {
          sh_setHref(tags, numTags, inputString);
        }
      }
      if (style) {
        var clone;
        if (style === 'sh_url') {
          clone = a.cloneNode(false);
        }
        else {
          clone = span.cloneNode(false);
        }
        clone.className = style;
        tags[numTags++] = {node: clone, pos: pos};
      }
    }
    pos += length;
    currentStyle = style;
  };

  var endOfLinePattern = /\r\n|\r|\n/g;
  endOfLinePattern.lastIndex = 0;
  var inputStringLength = inputString.length;
  while (pos < inputStringLength) {
    var start = pos;
    var end;
    var startOfNextLine;
    var endOfLineMatch = endOfLinePattern.exec(inputString);
    if (endOfLineMatch === null) {
      end = inputStringLength;
      startOfNextLine = inputStringLength;
    }
    else {
      end = endOfLineMatch.index;
      startOfNextLine = endOfLinePattern.lastIndex;
    }

    var line = inputString.substring(start, end);

    var matchCache = [];
    for (;;) {
      var posWithinLine = pos - start;

      var stateIndex;
      var stackLength = patternStack.length;
      if (stackLength === 0) {
        stateIndex = 0;
      }
      else {
        // get the next state
        stateIndex = patternStack[stackLength - 1][2];
      }

      var state = language[stateIndex];
      var numPatterns = state.length;
      var mc = matchCache[stateIndex];
      if (! mc) {
        mc = matchCache[stateIndex] = [];
      }
      var bestMatch = null;
      var bestPatternIndex = -1;
      for (var i = 0; i < numPatterns; i++) {
        var match;
        if (i < mc.length && (mc[i] === null || posWithinLine <= mc[i].index)) {
          match = mc[i];
        }
        else {
          var regex = state[i][0];
          regex.lastIndex = posWithinLine;
          match = regex.exec(line);
          mc[i] = match;
        }
        if (match !== null && (bestMatch === null || match.index < bestMatch.index)) {
          bestMatch = match;
          bestPatternIndex = i;
          if (match.index === posWithinLine) {
            break;
          }
        }
      }

      if (bestMatch === null) {
        output(line.substring(posWithinLine), null);
        break;
      }
      else {
        // got a match
        if (bestMatch.index > posWithinLine) {
          output(line.substring(posWithinLine, bestMatch.index), null);
        }

        var pattern = state[bestPatternIndex];

        var newStyle = pattern[1];
        var matchedString;
        if (newStyle instanceof Array) {
          for (var subexpression = 0; subexpression < newStyle.length; subexpression++) {
            matchedString = bestMatch[subexpression + 1];
            output(matchedString, newStyle[subexpression]);
          }
        }
        else {
          matchedString = bestMatch[0];
          output(matchedString, newStyle);
        }

        switch (pattern[2]) {
        case -1:
          // do nothing
          break;
        case -2:
          // exit
          patternStack.pop();
          break;
        case -3:
          // exitall
          patternStack.length = 0;
          break;
        default:
          // this was the start of a delimited pattern or a state/environment
          patternStack.push(pattern);
          break;
        }
      }
    }

    // end of the line
    if (currentStyle) {
      tags[numTags++] = {pos: pos};
      if (currentStyle === 'sh_url') {
        sh_setHref(tags, numTags, inputString);
      }
      currentStyle = null;
    }
    pos = startOfNextLine;
  }

  return tags;
}

////////////////////////////////////////////////////////////////////////////////
// DOM-dependent functions

function sh_getClasses(element) {
  var result = [];
  var htmlClass = element.className;
  if (htmlClass && htmlClass.length > 0) {
    var htmlClasses = htmlClass.split(' ');
    for (var i = 0; i < htmlClasses.length; i++) {
      if (htmlClasses[i].length > 0) {
        result.push(htmlClasses[i]);
      }
    }
  }
  return result;
}

function sh_addClass(element, name) {
  var htmlClasses = sh_getClasses(element);
  for (var i = 0; i < htmlClasses.length; i++) {
    if (name.toLowerCase() === htmlClasses[i].toLowerCase()) {
      return;
    }
  }
  htmlClasses.push(name);
  element.className = htmlClasses.join(' ');
}

/**
Extracts the tags from an HTML DOM NodeList.
@param  nodeList  a DOM NodeList
@param  result  an object with text, tags and pos properties
*/
function sh_extractTagsFromNodeList(nodeList, result) {
  var length = nodeList.length;
  for (var i = 0; i < length; i++) {
    var node = nodeList.item(i);
    switch (node.nodeType) {
    case 1:
      if (node.nodeName.toLowerCase() === 'br') {
        var terminator;
        if (/MSIE/.test(navigator.userAgent)) {
          terminator = '\r';
        }
        else {
          terminator = '\n';
        }
        result.text.push(terminator);
        result.pos++;
      }
      else {
        result.tags.push({node: node.cloneNode(false), pos: result.pos});
        sh_extractTagsFromNodeList(node.childNodes, result);
        result.tags.push({pos: result.pos});
      }
      break;
    case 3:
    case 4:
      result.text.push(node.data);
      result.pos += node.length;
      break;
    }
  }
}

/**
Extracts the tags from the text of an HTML element. The extracted tags will be
returned as an array of tag objects. See sh_highlightString for the format of
the tag objects.
@param  element  a DOM element
@param  tags  an empty array; the extracted tag objects will be returned in it
@return  the text of the element
@see  sh_highlightString
*/
function sh_extractTags(element, tags) {
  var result = {};
  result.text = [];
  result.tags = tags;
  result.pos = 0;
  sh_extractTagsFromNodeList(element.childNodes, result);
  return result.text.join('');
}

/**
Merges the original tags from an element with the tags produced by highlighting.
@param  originalTags  an array containing the original tags
@param  highlightTags  an array containing the highlighting tags - these must not overlap
@result  an array containing the merged tags
*/
function sh_mergeTags(originalTags, highlightTags) {
  var numOriginalTags = originalTags.length;
  if (numOriginalTags === 0) {
    return highlightTags;
  }

  var numHighlightTags = highlightTags.length;
  if (numHighlightTags === 0) {
    return originalTags;
  }

  var result = [];
  var originalIndex = 0;
  var highlightIndex = 0;

  while (originalIndex < numOriginalTags && highlightIndex < numHighlightTags) {
    var originalTag = originalTags[originalIndex];
    var highlightTag = highlightTags[highlightIndex];

    if (originalTag.pos <= highlightTag.pos) {
      result.push(originalTag);
      originalIndex++;
    }
    else {
      result.push(highlightTag);
      if (highlightTags[highlightIndex + 1].pos <= originalTag.pos) {
        highlightIndex++;
        result.push(highlightTags[highlightIndex]);
        highlightIndex++;
      }
      else {
        // new end tag
        result.push({pos: originalTag.pos});

        // new start tag
        highlightTags[highlightIndex] = {node: highlightTag.node.cloneNode(false), pos: originalTag.pos};
      }
    }
  }

  while (originalIndex < numOriginalTags) {
    result.push(originalTags[originalIndex]);
    originalIndex++;
  }

  while (highlightIndex < numHighlightTags) {
    result.push(highlightTags[highlightIndex]);
    highlightIndex++;
  }

  return result;
}

/**
Inserts tags into text.
@param  tags  an array of tag objects
@param  text  a string representing the text
@return  a DOM DocumentFragment representing the resulting HTML
*/
function sh_insertTags(tags, text) {
  var doc = document;

  var result = document.createDocumentFragment();
  var tagIndex = 0;
  var numTags = tags.length;
  var textPos = 0;
  var textLength = text.length;
  var currentNode = result;

  // output one tag or text node every iteration
  while (textPos < textLength || tagIndex < numTags) {
    var tag;
    var tagPos;
    if (tagIndex < numTags) {
      tag = tags[tagIndex];
      tagPos = tag.pos;
    }
    else {
      tagPos = textLength;
    }

    if (tagPos <= textPos) {
      // output the tag
      if (tag.node) {
        // start tag
        var newNode = tag.node;
        currentNode.appendChild(newNode);
        currentNode = newNode;
      }
      else {
        // end tag
        currentNode = currentNode.parentNode;
      }
      tagIndex++;
    }
    else {
      // output text
      currentNode.appendChild(doc.createTextNode(text.substring(textPos, tagPos)));
      textPos = tagPos;
    }
  }

  return result;
}

/**
Highlights an element containing source code.  Upon completion of this function,
the element will have been placed in the "sh_sourceCode" class.
@param  element  a DOM <pre> element containing the source code to be highlighted
@param  language  a language definition object
*/
function sh_highlightElement(element, language) {
  sh_addClass(element, 'sh_sourceCode');
  var originalTags = [];
  var inputString = sh_extractTags(element, originalTags);
  var highlightTags = sh_highlightString(inputString, language);
  var tags = sh_mergeTags(originalTags, highlightTags);
  var documentFragment = sh_insertTags(tags, inputString);
  while (element.hasChildNodes()) {
    element.removeChild(element.firstChild);
  }
  element.appendChild(documentFragment);
}
/*
function sh_getXMLHttpRequest() {
  if (window.ActiveXObject) {
    return new ActiveXObject('Msxml2.XMLHTTP');
  }
  else if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  throw 'No XMLHttpRequest implementation available';
}

function sh_load(language, element, prefix, suffix) {
  if (language in sh_requests) {
    sh_requests[language].push(element);
    return;
  }
  sh_requests[language] = [element];
  var request = sh_getXMLHttpRequest();
  var url = prefix + 'sh_' + language + suffix;
  request.open('GET', url, true);
  request.onreadystatechange = function () {
    if (request.readyState === 4) {
      try {
        if (! request.status || request.status === 200) {
          eval(request.responseText);
          var elements = sh_requests[language];
          for (var i = 0; i < elements.length; i++) {
            sh_highlightElement(elements[i], sh_languages[language]);
          }
        }
        else {
          throw 'HTTP error: status ' + request.status;
        }
      }
      finally {
        request = null;
      }
    }
  };
  request.send(null);
}
*/
/**
Highlights all elements containing source code on the current page. Elements
containing source code must be "pre" elements with a "class" attribute of
"sh_LANGUAGE", where LANGUAGE is a valid language identifier; e.g., "sh_java"
identifies the element as containing "java" language source code.
*/
/*
function sh_highlightDocument(prefix, suffix) {
  var nodeList = document.getElementsByTagName('pre');
  for (var i = 0; i < nodeList.length; i++) {
    var element = nodeList.item(i);
    var htmlClasses = sh_getClasses(element);
    for (var j = 0; j < htmlClasses.length; j++) {
      var htmlClass = htmlClasses[j].toLowerCase();
      if (htmlClass === 'sh_sourcecode') {
        continue;
      }
      if (htmlClass.substr(0, 3) === 'sh_') {
        var language = htmlClass.substring(3);
        if (language in sh_languages) {
          sh_highlightElement(element, sh_languages[language]);
        }
        else if (typeof(prefix) === 'string' && typeof(suffix) === 'string') {
          sh_load(language, element, prefix, suffix);
        }
        else {
          throw 'Found <pre> element with class="' + htmlClass + '", but no such language exists';
        }
        break;
      }
    }
  }
}
*/


if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['c'] = [
  [
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /(\bstruct)([ \t]+)([A-Za-z0-9_]+)/g,
      ['sh_keyword', 'sh_normal', 'sh_classname'],
      -1
    ],
    [
      /^[ \t]*#(?:[ \t]*include)/g,
      'sh_preproc',
      10,
      1
    ],
    [
      /^[ \t]*#(?:[ \t]*[A-Za-z0-9_]*)/g,
      'sh_preproc',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      13
    ],
    [
      /'/g,
      'sh_string',
      14
    ],
    [
      /\b(?:__asm|__cdecl|__declspec|__export|__far16|__fastcall|__fortran|__import|__pascal|__rtti|__stdcall|_asm|_cdecl|__except|_export|_far16|_fastcall|__finally|_fortran|_import|_pascal|_stdcall|__thread|__try|asm|auto|break|case|catch|cdecl|const|continue|default|do|else|enum|extern|for|goto|if|pascal|register|return|sizeof|static|struct|switch|typedef|union|volatile|while)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /\b(?:bool|char|double|float|int|long|short|signed|unsigned|void|wchar_t)\b/g,
      'sh_type',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ],
    [
      /([A-Za-z](?:[^`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\s]|[_])*)((?:<.*>)?)(\s+(?=[*&]*[A-Za-z][^`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\s]*\s*[`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\[\]]+))/g,
      ['sh_usertype', 'sh_usertype', 'sh_normal'],
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /</g,
      'sh_string',
      11
    ],
    [
      /"/g,
      'sh_string',
      12
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      />/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ]
];


if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['cpp'] = [
  [
    [
      /(\b(?:class|struct|typename))([ \t]+)([A-Za-z0-9_]+)/g,
      ['sh_keyword', 'sh_normal', 'sh_classname'],
      -1
    ],
    [
      /\b(?:class|const_cast|delete|dynamic_cast|explicit|false|friend|inline|mutable|namespace|new|operator|private|protected|public|reinterpret_cast|static_cast|template|this|throw|true|try|typeid|typename|using|virtual)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /(\bstruct)([ \t]+)([A-Za-z0-9_]+)/g,
      ['sh_keyword', 'sh_normal', 'sh_classname'],
      -1
    ],
    [
      /^[ \t]*#(?:[ \t]*include)/g,
      'sh_preproc',
      10,
      1
    ],
    [
      /^[ \t]*#(?:[ \t]*[A-Za-z0-9_]*)/g,
      'sh_preproc',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      13
    ],
    [
      /'/g,
      'sh_string',
      14
    ],
    [
      /\b(?:__asm|__cdecl|__declspec|__export|__far16|__fastcall|__fortran|__import|__pascal|__rtti|__stdcall|_asm|_cdecl|__except|_export|_far16|_fastcall|__finally|_fortran|_import|_pascal|_stdcall|__thread|__try|asm|auto|break|case|catch|cdecl|const|continue|default|do|else|enum|extern|for|goto|if|pascal|register|return|sizeof|static|struct|switch|typedef|union|volatile|while)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /\b(?:bool|char|double|float|int|long|short|signed|unsigned|void|wchar_t)\b/g,
      'sh_type',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ],
    [
      /([A-Za-z](?:[^`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\s]|[_])*)((?:<.*>)?)(\s+(?=[*&]*[A-Za-z][^`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\s]*\s*[`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\[\]]+))/g,
      ['sh_usertype', 'sh_usertype', 'sh_normal'],
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /</g,
      'sh_string',
      11
    ],
    [
      /"/g,
      'sh_string',
      12
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      />/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['diff'] = [
  [
    [
      /(?=^[-]{3})/g,
      'sh_oldfile',
      1,
      1
    ],
    [
      /(?=^[*]{3})/g,
      'sh_oldfile',
      3,
      1
    ],
    [
      /(?=^[\d])/g,
      'sh_difflines',
      6,
      1
    ]
  ],
  [
    [
      /^[-]{3}/g,
      'sh_oldfile',
      2
    ],
    [
      /^[-]/g,
      'sh_oldfile',
      2
    ],
    [
      /^[+]/g,
      'sh_newfile',
      2
    ],
    [
      /^@@/g,
      'sh_difflines',
      2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /^[*]{3}[ \t]+[\d]/g,
      'sh_oldfile',
      4
    ],
    [
      /^[*]{3}/g,
      'sh_oldfile',
      2
    ],
    [
      /^[-]{3}[ \t]+[\d]/g,
      'sh_newfile',
      5
    ],
    [
      /^[-]{3}/g,
      'sh_newfile',
      2
    ]
  ],
  [
    [
      /^[\s]/g,
      'sh_normal',
      2
    ],
    [
      /(?=^[-]{3})/g,
      'sh_newfile',
      -2
    ]
  ],
  [
    [
      /^[\s]/g,
      'sh_normal',
      2
    ],
    [
      /(?=^[*]{3})/g,
      'sh_newfile',
      -2
    ],
    [
      /^diff/g,
      'sh_normal',
      2
    ]
  ],
  [
    [
      /^[\d]/g,
      'sh_difflines',
      2
    ],
    [
      /^[<]/g,
      'sh_oldfile',
      2
    ],
    [
      /^[>]/g,
      'sh_newfile',
      2
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['html'] = [
  [
    [
      /<\?xml/g,
      'sh_preproc',
      1,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      3,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      4
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      5,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      5,
      1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      4
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['javascript'] = [
  [
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /\b(?:abstract|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|final|finally|for|function|goto|if|implements|in|instanceof|interface|native|new|null|private|protected|prototype|public|return|static|super|switch|synchronized|throw|throws|this|transient|true|try|typeof|var|volatile|while|with)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /(\+\+|--|\)|\])(\s*)(\/=?(?![*\/]))/g,
      ['sh_symbol', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /(0x[A-Fa-f0-9]+|(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?)(\s*)(\/(?![*\/]))/g,
      ['sh_number', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /([A-Za-z$_][A-Za-z0-9$_]*\s*)(\/=?(?![*\/]))/g,
      ['sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /\/(?:\\.|[^*\\\/])(?:\\.|[^\\\/])*\/[gim]*/g,
      'sh_regexp',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      10
    ],
    [
      /'/g,
      'sh_string',
      11
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /\b(?:Math|Infinity|NaN|undefined|arguments)\b/g,
      'sh_predef_var',
      -1
    ],
    [
      /\b(?:Array|Boolean|Date|Error|EvalError|Function|Number|Object|RangeError|ReferenceError|RegExp|String|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt)\b/g,
      'sh_predef_func',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['python'] = [
  [
    [
      /\b(?:import|from)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /#/g,
      'sh_comment',
      1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /\b(?:and|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|global|if|in|is|lambda|not|or|pass|print|raise|return|try|while)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /^(?:[\s]*'{3})/g,
      'sh_comment',
      2
    ],
    [
      /^(?:[\s]*\"{3})/g,
      'sh_comment',
      3
    ],
    [
      /^(?:[\s]*'(?:[^\\']|\\.)*'[\s]*|[\s]*\"(?:[^\\\"]|\\.)*\"[\s]*)$/g,
      'sh_comment',
      -1
    ],
    [
      /(?:[\s]*'{3})/g,
      'sh_string',
      4
    ],
    [
      /(?:[\s]*\"{3})/g,
      'sh_string',
      5
    ],
    [
      /"/g,
      'sh_string',
      6
    ],
    [
      /'/g,
      'sh_string',
      7
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\||\{|\}/g,
      'sh_symbol',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /(?:'{3})/g,
      'sh_comment',
      -2
    ]
  ],
  [
    [
      /(?:\"{3})/g,
      'sh_comment',
      -2
    ]
  ],
  [
    [
      /(?:'{3})/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /(?:\"{3})/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|')/g,
      null,
      -1
    ],
    [
      /'/g,
      'sh_string',
      -2
    ]
  ]
];




if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['ruby'] = [
  [
    [
      /\b(?:require)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      1
    ],
    [
      /'/g,
      'sh_string',
      2
    ],
    [
      /</g,
      'sh_string',
      3
    ],
    [
      /\/[^\n]*\//g,
      'sh_regexp',
      -1
    ],
    [
      /(%r)(\{(?:\\\}|#\{[A-Za-z0-9]+\}|[^}])*\})/g,
      ['sh_symbol', 'sh_regexp'],
      -1
    ],
    [
      /\b(?:alias|begin|BEGIN|break|case|defined|do|else|elsif|end|END|ensure|for|if|in|include|loop|next|raise|redo|rescue|retry|return|super|then|undef|unless|until|when|while|yield|false|nil|self|true|__FILE__|__LINE__|and|not|or|def|class|module|catch|fail|load|throw)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /(?:^\=begin)/g,
      'sh_comment',
      4
    ],
    [
      /(?:\$[#]?|@@|@)(?:[A-Za-z0-9_]+|'|\"|\/)/g,
      'sh_type',
      -1
    ],
    [
      /[A-Za-z0-9]+(?:\?|!)/g,
      'sh_normal',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /(#)(\{)/g,
      ['sh_symbol', 'sh_cbracket'],
      -1
    ],
    [
      /#/g,
      'sh_comment',
      5
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|')/g,
      null,
      -1
    ],
    [
      /'/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      />/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /^(?:\=end)/g,
      'sh_comment',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ]
];





if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['sh'] = [
  [
    [
      /\b(?:import)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /\\"|\\'/g,
      'sh_normal',
      -1
    ],
    [
      /"/g,
      'sh_string',
      1
    ],
    [
      /'/g,
      'sh_string',
      2
    ],
    [
      /function[ \t]+(?:[A-Za-z]|_)[A-Za-z0-9_]*[ \t]*(?:\(\))?|(?:[A-Za-z]|_)[A-Za-z0-9_]*[ \t]*\(\)/g,
      'sh_function',
      -1
    ],
    [
      /(?:[A-Za-z]*[-\/]+[A-Za-z]+)+/g,
      'sh_normal',
      -1
    ],
    [
      /\b(?:alias|bg|bind|break|builtin|caller|case|command|compgen|complete|continue|declare|dirs|disown|do|done|elif|else|enable|esac|eval|exec|exit|export|false|fc|fg|fi|for|getopts|hash|help|history|if|in|jobs|let|local|logout|popd|printf|pushd|read|readonly|return|select|set|shift|shopt|source|suspend|test|then|times|trap|true|type|typeset|umask|unalias|unset|until|wait|while)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?==)|\$\{(?:[^ \t]+)\}|\$\((?:[^ \t]+)\)|\$(?:[A-Za-z]|_)[A-Za-z0-9_]*|\$(?:[^ \t]{1})/g,
      'sh_variable',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\||%%|(?:##){2}(?!#)/g,
      'sh_symbol',
      -1
    ],
    [
      /#/g,
      'sh_comment',
      3
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ]
];




if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['xml'] = [
  [
    [
      /<\?xml/g,
      'sh_preproc',
      1,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      3,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      4
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      5,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      4
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['css'] = [
  [
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /(?:\.|#)[A-Za-z0-9_]+/g,
      'sh_selector',
      -1
    ],
    [
      /\{/g,
      'sh_cbracket',
      10,
      1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\}/g,
      'sh_cbracket',
      -2
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /[A-Za-z0-9_-]+[ \t]*:/g,
      'sh_property',
      -1
    ],
    [
      /[.%A-Za-z0-9_-]+/g,
      'sh_value',
      -1
    ],
    [
      /#(?:[A-Za-z0-9_]+)/g,
      'sh_string',
      -1
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['perl'] = [
  [
    [
      /\b(?:import)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /(s)(\{(?:\\\}|[^}])*\}\{(?:\\\}|[^}])*\})([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)(\((?:\\\)|[^)])*\)\((?:\\\)|[^)])*\))([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)(\[(?:\\\]|[^\]])*\]\[(?:\\\]|[^\]])*\])([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)(<.*><.*>)([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(q(?:q?))(\{(?:\\\}|[^}])*\})/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))(\((?:\\\)|[^)])*\))/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))(\[(?:\\\]|[^\]])*\])/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))(<.*>)/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))([^A-Za-z0-9 \t])(.*\2)/g,
      ['sh_keyword', 'sh_string', 'sh_string'],
      -1
    ],
    [
      /(s)([^A-Za-z0-9 \t])(.*\2.*\2)([ixsmogce]*(?=[ \t]*(?:\)|;)))/g,
      ['sh_keyword', 'sh_regexp', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)([^A-Za-z0-9 \t])(.*\2[ \t]*)([^A-Za-z0-9 \t])(.*\4)([ixsmogce]*(?=[ \t]*(?:\)|;)))/g,
      ['sh_keyword', 'sh_regexp', 'sh_regexp', 'sh_regexp', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /#/g,
      'sh_comment',
      1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /(?:m|qr)(?=\{)/g,
      'sh_keyword',
      2
    ],
    [
      /(?:m|qr)(?=#)/g,
      'sh_keyword',
      4
    ],
    [
      /(?:m|qr)(?=\|)/g,
      'sh_keyword',
      6
    ],
    [
      /(?:m|qr)(?=@)/g,
      'sh_keyword',
      8
    ],
    [
      /(?:m|qr)(?=<)/g,
      'sh_keyword',
      10
    ],
    [
      /(?:m|qr)(?=\[)/g,
      'sh_keyword',
      12
    ],
    [
      /(?:m|qr)(?=\\)/g,
      'sh_keyword',
      14
    ],
    [
      /(?:m|qr)(?=\/)/g,
      'sh_keyword',
      16
    ],
    [
      /"/g,
      'sh_string',
      18
    ],
    [
      /'/g,
      'sh_string',
      19
    ],
    [
      /</g,
      'sh_string',
      20
    ],
    [
      /\/[^\n]*\//g,
      'sh_string',
      -1
    ],
    [
      /\b(?:chomp|chop|chr|crypt|hex|i|index|lc|lcfirst|length|oct|ord|pack|q|qq|reverse|rindex|sprintf|substr|tr|uc|ucfirst|m|s|g|qw|abs|atan2|cos|exp|hex|int|log|oct|rand|sin|sqrt|srand|my|local|our|delete|each|exists|keys|values|pack|read|syscall|sysread|syswrite|unpack|vec|undef|unless|return|length|grep|sort|caller|continue|dump|eval|exit|goto|last|next|redo|sub|wantarray|pop|push|shift|splice|unshift|split|switch|join|defined|foreach|last|chop|chomp|bless|dbmclose|dbmopen|ref|tie|tied|untie|while|next|map|eq|die|cmp|lc|uc|and|do|if|else|elsif|for|use|require|package|import|chdir|chmod|chown|chroot|fcntl|glob|ioctl|link|lstat|mkdir|open|opendir|readlink|rename|rmdir|stat|symlink|umask|unlink|utime|binmode|close|closedir|dbmclose|dbmopen|die|eof|fileno|flock|format|getc|print|printf|read|readdir|rewinddir|seek|seekdir|select|syscall|sysread|sysseek|syswrite|tell|telldir|truncate|warn|write|alarm|exec|fork|getpgrp|getppid|getpriority|kill|pipe|qx|setpgrp|setpriority|sleep|system|times|x|wait|waitpid)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /^\=(?:head1|head2|item)/g,
      'sh_comment',
      21
    ],
    [
      /(?:\$[#]?|@|%)[\/A-Za-z0-9_]+/g,
      'sh_variable',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\{/g,
      'sh_regexp',
      3
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\{|\\\}|\}/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /#/g,
      'sh_regexp',
      5
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\#|#/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\|/g,
      'sh_regexp',
      7
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\||\|/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /@/g,
      'sh_regexp',
      9
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\@|@/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /</g,
      'sh_regexp',
      11
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\<|\\>|>/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\[/g,
      'sh_regexp',
      13
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\]|\]/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\\/g,
      'sh_regexp',
      15
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\\|\\/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\//g,
      'sh_regexp',
      17
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\/|\//g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|')/g,
      null,
      -1
    ],
    [
      /'/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      />/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /\=cut/g,
      'sh_comment',
      -2
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['php'] = [
  [
    [
      /\b(?:include|include_once|require|require_once)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /\/\//g,
      'sh_comment',
      1
    ],
    [
      /#/g,
      'sh_comment',
      1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ],
    [
      /'/g,
      'sh_string',
      3
    ],
    [
      /\b(?:and|or|xor|__FILE__|exception|php_user_filter|__LINE__|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|each|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|for|foreach|function|global|if|isset|list|new|old_function|print|return|static|switch|unset|use|var|while|__FUNCTION__|__CLASS__|__METHOD__)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /\/\/\//g,
      'sh_comment',
      4
    ],
    [
      /\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      9
    ],
    [
      /\/\*/g,
      'sh_comment',
      10
    ],
    [
      /(?:\$[#]?|@|%)[A-Za-z0-9_]+/g,
      'sh_variable',
      -1
    ],
    [
      /<\?php|~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /\\(?:\\|')/g,
      null,
      -1
    ],
    [
      /'/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      5,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      6,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      7
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      8,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      8,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      7
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      5,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      6,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      7
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      8,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      8,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ]
];




if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['sql'] = [
  [
    [
      /\b(?:VARCHAR|TINYINT|TEXT|DATE|SMALLINT|MEDIUMINT|INT|BIGINT|FLOAT|DOUBLE|DECIMAL|DATETIME|TIMESTAMP|TIME|YEAR|UNSIGNED|CHAR|TINYBLOB|TINYTEXT|BLOB|MEDIUMBLOB|MEDIUMTEXT|LONGBLOB|LONGTEXT|ENUM|BOOL|BINARY|VARBINARY)\b/gi,
      'sh_type',
      -1
    ],
    [
      /\b(?:ALL|ASC|AS|ALTER|AND|ADD|AUTO_INCREMENT|BETWEEN|BINARY|BOTH|BY|BOOLEAN|CHANGE|CHECK|COLUMNS|COLUMN|CROSS|CREATE|DATABASES|DATABASE|DATA|DELAYED|DESCRIBE|DESC|DISTINCT|DELETE|DROP|DEFAULT|ENCLOSED|ESCAPED|EXISTS|EXPLAIN|FIELDS|FIELD|FLUSH|FOR|FOREIGN|FUNCTION|FROM|GROUP|GRANT|HAVING|IGNORE|INDEX|INFILE|INSERT|INNER|INTO|IDENTIFIED|IN|IS|IF|JOIN|KEYS|KILL|KEY|LEADING|LIKE|LIMIT|LINES|LOAD|LOCAL|LOCK|LOW_PRIORITY|LEFT|LANGUAGE|MODIFY|NATURAL|NOT|NULL|NEXTVAL|OPTIMIZE|OPTION|OPTIONALLY|ORDER|OUTFILE|OR|OUTER|ON|PROCEDURE|PROCEDURAL|PRIMARY|READ|REFERENCES|REGEXP|RENAME|REPLACE|RETURN|REVOKE|RLIKE|RIGHT|SHOW|SONAME|STATUS|STRAIGHT_JOIN|SELECT|SETVAL|SET|TABLES|TERMINATED|TO|TRAILING|TRUNCATE|TABLE|TEMPORARY|TRIGGER|TRUSTED|UNIQUE|UNLOCK|USE|USING|UPDATE|VALUES|VARIABLES|VIEW|WITH|WRITE|WHERE|ZEROFILL|TYPE|XOR)\b/gi,
      'sh_keyword',
      -1
    ],
    [
      /"/g,
      'sh_string',
      1
    ],
    [
      /'/g,
      'sh_string',
      2
    ],
    [
      /`/g,
      'sh_string',
      3
    ],
    [
      /#/g,
      'sh_comment',
      4
    ],
    [
      /\/\/\//g,
      'sh_comment',
      5
    ],
    [
      /\/\//g,
      'sh_comment',
      4
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      11
    ],
    [
      /\/\*/g,
      'sh_comment',
      12
    ],
    [
      /--/g,
      'sh_comment',
      4
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /`/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      6,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      8,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      9
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      10,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      10,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      7
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      7
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      9
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      7
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      6,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      8,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      9
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      10,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      10,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ]
];




if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['java'] = [
  [
    [
      /\b(?:import|package)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      10
    ],
    [
      /'/g,
      'sh_string',
      11
    ],
    [
      /(\b(?:class|interface))([ \t]+)([$A-Za-z0-9_]+)/g,
      ['sh_keyword', 'sh_normal', 'sh_classname'],
      -1
    ],
    [
      /\b(?:abstract|assert|break|case|catch|class|const|continue|default|do|else|extends|false|final|finally|for|goto|if|implements|instanceof|interface|native|new|null|private|protected|public|return|static|strictfp|super|switch|synchronized|throw|throws|true|this|transient|try|volatile|while)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /\b(?:int|byte|boolean|char|long|float|double|short|void)\b/g,
      'sh_type',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ],
    [
      /([A-Za-z](?:[^`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\s]|[_])*)((?:<.*>)?)(\s+(?=[*&]*[A-Za-z][^`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\s]*\s*[`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-\[\]]+))/g,
      ['sh_usertype', 'sh_usertype', 'sh_normal'],
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ]
];



if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['scala'] = [
  [
    [
      /\b(?:import|package)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      10
    ],
    [
      /'/g,
      'sh_string',
      11
    ],
    [
      /(\b(?:class|trait))([ \t]+)([$A-Za-z0-9_]+)/g,
      ['sh_keyword', 'sh_normal', 'sh_classname'],
      -1
    ],
    [
      /abstract|case|catch|class|def|do|else|extends|false|final|finally|for|forSome|if|implicit|import|lazy|match|new|null|object|override|package|private|protected|requires|return|sealed|super|this|throw|trait|try|true|type|val|var|while|with|yield|_|:|=>|=|<-|<:|<%|>:|#|@/g,
      'sh_keyword',
      -1
    ],
    [
      /\b(?:Int|Byte|Boolean|Char|Long|Float|Double|Short|Nil)\b/g,
      'sh_type',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_|[`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-])(?:[A-Za-z0-9_]|[`~!@#$%&*()_=+{}|;:",<.>\/?'\\[\]\^\-])*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ]
];

var bloggerHatenaMarkup = function () {
  console.debug("user script started");
  
  var isShown = function(el) {
    return el.offsetWidth !== 0;
  };
  
  var hatena = new Hatena({sectionanchor: '\u25a0'});
  var textarea = null;
  var hatenaEditor = null;
  var hatenaPreview = null;
  
  var postingHtmlBoxHiddenState = function() {
    console.debug(">>> on postingHtmlBoxHiddenState");
  
    var observer = new MutationObserver(function() {
      console.debug(">>> on postingHtmlBoxHiddenState mutation found");
      if (!isShown(textarea)) {
        return;
      }
      observer.disconnect();
      
      postingHtmlBoxShownState();
    });
    observer.observe(document.body, { attributes: true, subtree: true });
  };
  
  var postingHtmlBoxShownState = function() {
    console.debug(">>> on postingHtmlBoxShownState");
  
    var waitLoop = function() {
      if (!textarea.value.match(/^\s*$/)) {
        setTimeout(textareaToHatenaEditor, 50);
      } else {
        setTimeout(waitLoop, 100);
      }
    };
    waitLoop();
  
    var observer = new MutationObserver(function() {
      console.debug(">>> on postingHtmlBoxHiddenState mutation found");
      if (isShown(textarea)) {
        return;
      }
      observer.disconnect();
      
      postingHtmlBoxHiddenState();
    });
    observer.observe(document.body, { attributes: true, subtree: true });
  };

  var hatenaEditorToTextareaSynchronizer = (function() {
    var timer = null;
    var isOn = false;

    return {
      init: function() {
        hatenaEditor.addEventListener('input', function() {
          if (isOn) {
            clearTimeout(timer);
            timer = setTimeout(seePreview, 500);
          }
        }, false);
      },

      start: function() {
        if (!isOn) {
          isOn = true;
        }
      },

      stop: function() {
        if (isOn) {
          isOn = false;
          clearTimeout(timer);
        }
      }
    };
  })();

  var initHatena = function() {  
    var addHatenaElements = function() {
      var BOX_SIZING = "-moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;";
      textarea.style.height = "50%";
      textarea.style += BOX_SIZING;
      var box = textarea.parentElement;
      hatenaEditor = document.createElement("textarea");
      hatenaEditor.setAttribute("id", "hatenaEditor");
      hatenaEditor.setAttribute('style', [
        'resize:none;',
        'display:block;',
        'float:left;',
        'height:50%;',
        'width:50%;',
        'padding:0 0 0 5px;',
        BOX_SIZING
      ].join(''));
      hatenaPreview = document.createElement("div");
      hatenaPreview.setAttribute('id', "hatenaPreview");
      hatenaPreview.setAttribute('style', [
        'float:right;',
        'width:50%;',
        'height:50%;',
        'border:solid black 1px;',
        'padding:5px;',
        BOX_SIZING
      ].join(''));
      box.appendChild(hatenaEditor);
      box.appendChild(hatenaPreview);
    };
  
    var addStyles = function() {
      var style = document.createElement("style");
      style.textContent = [
        ,"#hatenaPreview h4 {"
          ,"font-weight: bold;"
          ,"font-size: 15px;"
        ,"}" // TODO complete this
      ].join('\n');
      document.head.appendChild(style);
    };
  
    addStyles();
    addHatenaElements();
    hatenaEditorToTextareaSynchronizer.init();
    hatenaEditorToTextareaSynchronizer.start();
  };
  
  var initState = function() {
    console.debug(">>> on initState");
  
    var observer = new MutationObserver(function() {
      console.debug(">>> on initState mutation found");
      if (!(textarea = document.getElementById("postingHtmlBox"))) {
        return;
      }
      observer.disconnect();
      
      initHatena();
      
      if (isShown(textarea)) {
        postingHtmlBoxShownState();
      } else {
        postingHtmlBoxHiddenState();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  
  var extractHatenaOrNull = function(str) {
    var m = str.match(/\n<!--HatenaKihou\r?\n([\s\S]*)\nHatenaKihou-->/);
    if (m === null) {
      return null;
    }
    return m[1].replace(/\{\{(\d+) hyphens\}\}/g, function($0,$1) { return String.times('-', +$1); });
  };
  
  var textareaToHatenaEditor = function() {
    var h = extractHatenaOrNull(textarea.value);
    if (h === null) {
      hatenaEditorToTextareaSynchronizer.stop();
      hatenaEditor.value = "";
      hatenaEditorToTextareaSynchronizer.start();
    } else {
      hatenaEditor.value = h;
      seePreview();
    }
  };
  
  initState();

  function seePreview() {
    hatena.parse(hatenaEditor.value);
    hatenaPreview.innerHTML = hatena.html();
    Array.prototype.forEach.call(
      hatenaPreview.getElementsByTagName("pre"), 
      function(pre) {
        if ((m = pre.className.match(/sh_(\S*)/)) && sh_languages[m[1]]) {
          sh_highlightElement(pre, sh_languages[m[1]]);
        }
      }
    );
    replaceTitles();
    setTextArea();
    fetchTitles();
  }

  function setTextArea() {
    textarea.value = hatenaPreview.innerHTML + "\n<!--HatenaKihou\n" + 
      hatenaEditor.value.replace(/-{2,}/g, 
        function($0) {return '{{'+$0.length+' hyphens}}'}
      ) + "\nHatenaKihou-->";
  }
  
  (function() {
    var script = document.createElement('script');
    script.textContent = [ // run in page's context. works for Greasemonkey & Chrome
      ,"function fireMyEvent(o) {"
        ,"if (o.error) return;"
        ,"var url = o.query.diagnostics.url;"
        ,"url = url.content || url[url.length - 1].content;"
        ,"var title = o.query.results;"
        ,"if (window.opera) {"
          ,"var ev = document.createEvent('Event');"
          ,"ev.initEvent('TitleReady', true, false);"
          ,"ev.url = url;"
          ,"ev.title = title;"
        ,"} else {"
          ,"var ev = document.createEvent('MessageEvent');"
          ,"ev.initMessageEvent('TitleReady', true, false," // type, canBubble, cancelable
            ,"JSON.stringify({url: url, title: title})," // data
            ,"location.protocol + '//' + location.host," // origin
            ,"''," // lastEventId
            ,"window" // source
          ,");"
        ,"}"
        ,"document.dispatchEvent(ev);"
      ,"}"
    ].join('\n');
    document.body.appendChild(script);
  })();
  
  var URL2TITLE = {};
  document.addEventListener('TitleReady', function(ev) {
    var data = ev.data ? JSON.parse(ev.data) : ev;
    URL2TITLE[data.url] = data.title || null;
    replaceTitles();
    setTextArea();
  }, false);
  
  function replaceTitles() {
    Array.prototype.forEach.call(
      hatenaPreview.getElementsByTagName('a'), 
      function(a) {
        if (a.textContent === '{{title}}') {
          var title = URL2TITLE[a.href];
          if (title === void 0) {
            // title must be fetched
          } else if (title === null) {
            a.textContent = a.href;
          } else if (title === '') {
            // JSONP not loaded yet
          } else {
            a.textContent = title;
            var grandpa = a.parentNode.parentNode;
            if (/blockquote/i.test(grandpa.tagName) && 
              grandpa.getAttribute('title') === '{{title}}') 
              grandpa.setAttribute('title', title);
          }
        }
      }
    );
  }
  
  function fetchTitles() {
    Array.prototype.forEach.call(
      hatenaPreview.getElementsByTagName('a'), 
      function(a) {
        var url = a.href;
        if (a.textContent === '{{title}}' && URL2TITLE[url] === void 0) {
          URL2TITLE[url] = '';
          var api = "http://query.yahooapis.com/v1/public/yql" +
            "?format=json&callback=fireMyEvent&q=select%20*%20from%20html%20where%20url%3d'" +
            encodeURIComponent(url) + "'%20and%20xpath%3d'%2f%2ftitle%2ftext()'";
          var script = document.createElement('script');
          script.src = api;
          document.body.appendChild(script);
        }
      }
    );
  }
};

bloggerHatenaMarkup();
