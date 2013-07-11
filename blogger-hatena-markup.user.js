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
		filter : args["filter"],
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
		this.self.html = this.self.filter(html, c);
	},

	html : function(){
		return this.self.html;
	}
}

// Hatena
Hatena = function(args){
	if(args == null) args = {};
	
	var beforeFilter = function(text, c) {
		var html = text;

		var aliases = function() {
			html = html.replace(/\[alias:([\w-]+):(https?:\/\/[^\]\s]+?)\]\n?/mg, function($0, $1, $2) {
				c.aliases($1, $2);
				return "";
			});
		};

		var insertImages = function() {
			html = html.replace(/\[gimage:([\w-]+)(?::([^\]]+))?\]/g, function($0, id, prop) {
				var props = prop.split(/,/);
				var size = props[0];
				var pos = props[1] || null;
				var alias = c.aliases(id);
				if (alias === null) {
					return "";
				}
				var url = alias.url.replace(/\/s\d+\//, "/s" + props[0] + "/");
				
				var img = document.createElement("img");
				img.src = url;

				var a = document.createElement("a");
				a.href = alias.url;
				if (pos === "left" || pos === "right") {
					a.style = "clear: " + pos + "; float: " + pos + "; text-align: center";
				}
				a.appendChild(img);
				
				var figure = document.createElement("figure");
				if (pos === "center") {
					figure.style = "clear: both; text-align: center;";
				}
				figure.appendChild(a);
				
				var con = document.createElement("div");
				con.appendChild(figure);
				
				return ">" + con.innerHTML + "<";
			});
		};

		aliases();
		insertImages();

		return html;
	};
	
	var afterFilter = function(text, c) {
		var html = "";

	  var footnote = function() {
			var p = c.self.permalink;
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
		};
		
		var autoLink = function() {
			// auto link (added by edvakf)
			html = html.replace(/\[(https?:\/\/[^\]\s]+?)(:title(=[^\]\n]*)?)?\]/g, function($0,$1,$2,$3) {
				return '<a href="' + String._escapeHTML($1) + '">' + (
					$3 ? String._escapeHTML($3.slice(1)) :          // title given by user
					$2 ? '{{title}}' : // title will be fetched (via YQL)
					$1                 // use URL instead of title
				) + '</a>';
			});
		};


		footnote();
		autoLink();

		return html;
	};

	this.self = {
		html : '',
		baseuri : args["baseuri"],
		permalink : args["permalink"] || "",
		ilevel : args["ilevel"] || 0,
		invalidnode : args["invalidnode"] || [],
		sectionanchor : args["sectionanchor"] || 'o-',
		beforeFilter : beforeFilter,
		afterFilter : afterFilter,
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
			beforeFilter : this.self.beforeFilter,
			afterFilter : this.self.afterFilter,
		});
		var c = this.self.context;

		var beforeFilter = new Hatena_HTMLFilter({
			context : c,
			filter: c.self.beforeFilter
		});
		beforeFilter.parse(c.self.text);
		c.text(beforeFilter.html());

		var node = new Hatena_BodyNode();
		node._new({
			context : c,
			ilevel : this.self.ilevel
		});
		node.parse();

		var afterFilter = new Hatena_HTMLFilter({
			context : c,
			filter: c.self.afterFilter
		});
		afterFilter.parse(c.html());
		this.self.html = afterFilter.html();

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
		beforeFilter : args["beforeFilter"],
		afterFilter : args["afterFilter"],
		_htmllines : [],
		footnotes : Array(),
		sectioncount : 0,
		syntaxrefs : [],
		noparagraph : 0,
		aliases: {},
	};
	this.init();
}
Hatena_Context.prototype = {
	init : function() {
		// this.text(this.self.text);
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

	text : function(text) {
		this.self.text = text.replace(/\r/g, "");
		this.self.lines = this.self.text.split('\n');
		this.self.index = -1;
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
	},

	aliases: function(id, url) {
		if (url != null) {
			this.self.aliases[id] =  { url: url };
		}
		return this.self.aliases[id];
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
		this.self.startstring = "<pre>"; // TODO add <code> and </code>
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
			this.self.startstring.replace('>',' class="prettyprint ' + m[1] + '">') :
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

var bloggerHatenaMarkup = function () {
	var insertTextUnderCursor = function(textarea, text) {
		var nSelStart = textarea.selectionStart;
		var nSelEnd = textarea.selectionEnd;
		var sOldText = textarea.value;
		textarea.value = sOldText.substring(0, nSelStart) + text + sOldText.substring(nSelEnd);
		var offset = nSelStart + text.length;
		textarea.setSelectionRange(offset, offset);
		textarea.focus();
	}

	var generateGuid = function() {
		var s4 = function() {
		  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		};
	  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	};

  var isShown = function(el) {
    return el.offsetWidth !== 0;
  };

  var isImageDialogShown = function() {
    var IMAGE_STR = "html-image-picker";
    var STR_LEN = IMAGE_STR.length;
    var iframes = document.getElementsByTagName("iframe");
    for (var i = 0; i < iframes.length; i++) {
      if (isShown(iframes[i]) && iframes[i].src.substr(-STR_LEN, STR_LEN) === IMAGE_STR) {
        return true;
      }
    }
    return false;
  };

  var isModalDialogShown = function() {
    var el = document.getElementById(":w");
    return !!el && isShown(el);
  };

  var hatena = new Hatena({sectionanchor: '\u25a0'});
  var textarea = null;
  var hatenaEditor = null;
  var hatenaEditorCheckbox = null;
  var hatenaPreview = null;
  var hatenaLeftContainer = null;
  
  var postingHtmlBoxHiddenState = function() {
    console.debug(">>> on postingHtmlBoxHiddenState");
  
    var observer = new MutationObserver(function() {
      console.debug(">>> on postingHtmlBoxHiddenState mutation found");
      if (!isShown(textarea)) {
        return;
      }
      observer.disconnect();
      
      var waitLoop = function() {
        if (!textarea.value.match(/^\s*$/)) {
          setTimeout(textareaToHatenaEditor, 50);
        } else {
          setTimeout(waitLoop, 100);
        }
      };
      waitLoop();
  
      postingHtmlBoxShownState();
    });
    observer.observe(document.body, { attributes: true, subtree: true });
  };
  
  var imageDialogShownState = function() {
    console.debug(">>> on imageDialogShownState");

    if (hatenaEditorToggler.isEnabled()) {
      textarea.setSelectionRange(0, 0);
    }

    var observer = new MutationObserver(function() {
      console.debug(">>> on imageDialogShownState mutation found");
      if (isImageDialogShown() || isModalDialogShown()) {
        return;
      }
      observer.disconnect();

      if (hatenaEditorToggler.isEnabled()) {
        addImageMarkup();
      }

      postingHtmlBoxShownState();
    });
    observer.observe(document.body, { childList: true, attributes: true, subtree: true });
  };
  
  var postingHtmlBoxShownState = function() {
    console.debug(">>> on postingHtmlBoxShownState");
  
    var observer = new MutationObserver(function() {
      console.debug(">>> on postingHtmlBoxShownState mutation found");
      if (isShown(textarea)) {
        if (isImageDialogShown()) {
          observer.disconnect();
          imageDialogShownState();
        }
      } else {
        observer.disconnect();
        
        hatenaEditorToggler.disable();
  
        postingHtmlBoxHiddenState();
      }
    });
    observer.observe(document.body, { childList: true, attributes: true, subtree: true });
  };

  var addImageMarkup = function() {
  	var extractImageData = function() {
	    var addedHtml = textarea.value.substr(0, textarea.selectionStart);
	    if (addedHtml.length === 0) {
	      return;
	    }
	    var d = document.createElement("div");
	    d.innerHTML = addedHtml;
	    
	    var extractData = function(el) {
		    var pos = null;
		    var size = null;
		    var url = null;
		
		    var inA = function (a) {
		    	if (a.style.clear === "left" || a.style.clear === "right") {
		    		pos = a.style.clear;
		    	}
		    	url = a.href;
		    	var img = a.childNodes[0];
		    	var m = img.src.match(/\/s(\d+)\//);
		    	if (m !== null) {
		    		size = parseInt(m[1]);
			    }
		    };
		
				console.debug(el.tagName);
		    if (el.tagName == "DIV") {
		    	pos = "center";
		    	inA(el.childNodes[0]);
		    } else {
		    	inA(el);
		    }
				
		    return {
		    	pos: pos,
		    	size: size,
		    	url: url,
		    	id: generateGuid()
		    };
	    };
	    
	    var idata = [];
	    for (var i = 0; i < d.childNodes.length; i++) {
		    idata.push(extractData(d.childNodes[i]));
	    }
	    
	    return idata;
  	};
  	
  	var outputToTextarea = function(imageData) {
  		var str = imageData.map(function(image) {
  			return "[gimage:" + image.id + ":" + image.size +
  				(image.pos !== null ? ("," + image.pos) : "") + "]\n";
  		}).join("");
  		insertTextUnderCursor(hatenaEditor, str);
  		
  		var currentPos = hatenaEditor.selectionStart;
  		hatenaEditor.setSelectionRange(hatenaEditor.value.length, hatenaEditor.value.length);
  		var str2 = imageData.map(function(image) {
  			return "\n[alias:" + image.id + ":" + image.url + "]";
  		}).join("");
  		insertTextUnderCursor(hatenaEditor, str2);
  		hatenaEditor.setSelectionRange(currentPos, currentPos);
  	};
  	
  	var imaged = extractImageData();
  	console.debug(imaged);
  	outputToTextarea(imaged);
  	
  	seePreview();
  };

  var hatenaEditorToggler = (function() {
    var enabled = false;

    var enable = function() {
      enabled = true;
      textarea.style.height = "20%";
      hatenaPreview.style.height = hatenaLeftContainer.style.height = "80%";
      hatenaEditorCheckbox.checked = true;
      hatenaEditor.disabled = false;
      hatenaEditorToTextareaSynchronizer.start();
    };

    var disable = function() {
      enabled = false;
      textarea.style.height = "80%";
      hatenaPreview.style.height = hatenaLeftContainer.style.height = "20%";
      hatenaEditorCheckbox.checked = false;
      hatenaEditor.disabled = true;
      hatenaEditorToTextareaSynchronizer.stop();
    };

    return {
      init: function() {
        hatenaEditorToTextareaSynchronizer.init();
        hatenaEditorCheckbox.addEventListener("click", function(e) {
          (enabled ? disable : enable)();
        }, false);

        disable();
      },

      enable: enable,
      disable: disable,
      isEnabled: function() {
        return enabled;
      }
    };
  })();

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
    var BOX_SIZING = "-moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;";
    var addHatenaElements = function() {
      var createLeftContainer = function() {
        var createHatenaEditor = function() {
          hatenaEditor = document.createElement("textarea");
          hatenaEditor.setAttribute("id", "hatenaEditor");
          hatenaEditor.setAttribute('style', [
            "width:100%;",
            "height:100%;",
            'resize:none;',
            'display:block;',
            BOX_SIZING
          ].join(''));

          var hatenaEditorDiv = document.createElement("div");
          hatenaEditorDiv.setAttribute('style', [
            "top:30px;",
            "bottom:0;",
            "position:absolute;",
            "width:100%;",
            BOX_SIZING
          ].join(''));
          hatenaEditorDiv.appendChild(hatenaEditor);

          return hatenaEditorDiv;
        };

        var createCheckbox = function() {
          hatenaEditorCheckbox = document.createElement("input");
          hatenaEditorCheckbox.setAttribute("type", "checkbox");
          hatenaEditorCheckbox.setAttribute("id", "hatenaEditorCheckbox");

          var label = document.createElement("label");
          label.setAttribute("for", "hatenaEditorCheckbox");
          label.appendChild(document.createTextNode("Use Hatena Markup"));

          var checkboxDiv = document.createElement("div");
          checkboxDiv.setAttribute('style', [
            "height:30px;",
            'padding:5px;'
          ].join(''));
          checkboxDiv.appendChild(hatenaEditorCheckbox);
          checkboxDiv.appendChild(label);

          return checkboxDiv;
        };

        hatenaLeftContainer = document.createElement("div");
        hatenaLeftContainer.setAttribute('style', [
          'position:relative;',
          'display:block;',
          'float:left;',
          'width:50%;',
          BOX_SIZING
        ].join(''));
        hatenaLeftContainer.appendChild(createCheckbox());
        hatenaLeftContainer.appendChild(createHatenaEditor());

        return hatenaLeftContainer;
      };

      var createHatenaPreview = function() {
        hatenaPreview = document.createElement("div");
        hatenaPreview.setAttribute('id', "hatenaPreview");
        hatenaPreview.setAttribute('style', [
          'float:right;',
          'width:50%;',
          'border:solid black 1px;',
          'padding:5px;',
          BOX_SIZING
        ].join(''));

        return hatenaPreview;
      };

      var box = textarea.parentElement;
      box.appendChild(createLeftContainer());
      box.appendChild(createHatenaPreview());
    };

    var addStyles = function() {
      var style = document.createElement("style");
      style.textContent = [
        ,"#postingHtmlBox {"
          ,BOX_SIZING
        ,"}"
        ,"#hatenaPreview h4 {"
          ,"font-weight: bold;"
          ,"font-size: 15px;"
        ,"}" // TODO complete this
      ].join('\n');
      document.head.appendChild(style);
    };
  
    addStyles();
    addHatenaElements();
    hatenaEditorToggler.init();
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
      // mutationObserverTester();
      
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
      hatenaEditor.value = "";
    } else {
      hatenaEditorToggler.enable();
      hatenaEditor.value = h;
      seePreview();
    }
  };
  
  initState();

  function seePreview() {
    hatena.parse(hatenaEditor.value);
    hatenaPreview.innerHTML = hatena.html();
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
