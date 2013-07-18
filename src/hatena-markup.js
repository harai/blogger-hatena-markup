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
};

String.times = function(str, time){
    var s = "";
    for(var i = 0; i < time; i++)s += str;
    return s;
};

String._escapeHTML = function(s){
    s = s.replace(/\&/g, "&amp;");
    s = s.replace(/</g, "&lt;");
    s = s.replace(/>/g, "&gt;");
    s = s.replace(/"/g, "&quot;");
    s = s.replace(/\'/g, "&#39");
    s = s.replace(/\\/g, "&#92");
    return s;
};

String._unescapeHTML = function(s){
    s = s.replace(/&amp;/g, "&");
    s = s.replace(/&lt;/g, "<");
    s = s.replace(/&gt;/g, ">");
    s = s.replace(/&quot;/g, "\"");
    return s;
};


Hatena = function(args){
    var document = args.doc;
    
    var beforeFilter = function(c) {
        var html = c.text();

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

        c.text(html);
    };
    
    var afterFilter = function(c) {
        var html = "";
        var text = c.html();

        var footnote = function() {
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
                    html += '<span class="footnote"><a href="#f' + num + '" title="' + note + '" name="fn' + num + '">*' + num + '</a></span>' + post;
                }
            }
        };
        
        var link = function() {
            // auto link (added by edvakf)
            html = html.replace(/\[(https?:\/\/[^\]\s]+?)(?::([^\]\n]*))?\]/g, function($0, url, str) {
                return '<a href="' + String._escapeHTML(url) + '">' + (str ? str : url) + '</a>';
            });
        };


        footnote();
        link();

        c.html(html);
    };

    this.self = {
        beforeFilter : beforeFilter,
        afterFilter : afterFilter,
    };
};
Hatena.prototype = {
    parse : function(text){
        this.self.context = new Hatena_Context({ text: text });
        var c = this.self.context;

        this.self.beforeFilter(c);

        var node = new Hatena_BodyNode();
        node._new({ context: c });
        node.parse();

        this.self.afterFilter(c);

        if (this.self.context.footnotes().length != 0) {
            var node = new Hatena_FootnoteNode();
            node._new({ context : c });
            node.parse();
        }
        this.self.html = c.html();
    }, 

    html : function(){
        return this.self.html;
    }
};


Hatena_Context = function(args){
    this.self = {
        text : args["text"],
        _htmllines : [],
        footnotes : [],
        noparagraph : 0,
        aliases: {},
        indent: 0,
        indentStr: "    ",
    };
    this.init();
};
Hatena_Context.prototype = {
    init: function() {
        this.text(this.self.text);
    },

    hasNext: function() {
        return (this.self.lines != null && this.self.lines.length - 1 > this.self.index);
    },

    peek: function() {
        return this.self.lines[this.self.index + 1];
    },

    next: function() {
        return this.self.lines[++this.self.index];
    },

    text: function(text) {
        if (text == null) {
            return this.self.text;
        }
        this.self.text = text.replace(/\r/g, "");
        this.self.lines = this.self.text.split('\n');
        this.self.index = -1;
    },

    html: function(html) {
        if (html != null) {
            this.self._htmllines = html.split("\n");
        }
        return this.self._htmllines.join ("\n");
    },

    putLine: function(line) {
        var iStr = String.times(this.self.indentStr, this.self.indent);
        this.self._htmllines.push(iStr + line);
    },

    putLineWithoutIndent: function(line) {
        this.self._htmllines.push(line);
    },

    getLastPut: function() {
        return this.self._htmllines[this.self._htmllines.length - 1];
    },

    footnotes: function(line) {
        if(line != null) this.self.footnotes.push(line);
        return this.self.footnotes;
    },

    noparagraph: function(noparagraph) {
        if(noparagraph != null) this.self.noparagraph = noparagraph;
        return this.self.noparagraph;
    },

    aliases: function(id, url) {
        if (url != null) {
            this.self.aliases[id] =  { url: url };
        }
        return this.self.aliases[id];
    },

    indent: function(f, num) {
        var n = (num == null) ? 1 : num;
        this.self.indent += n;
        var res = f();
        this.self.indent -= n;
        return res;
    }
};


Hatena_Node = function(){}
Hatena_Node.prototype = {
    pattern : "",

    _new : function(args){
        if(args == null) args = Array();
        this.self = {
            context : args["context"],
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


Hatena_BodyNode = function(){};
Hatena_BodyNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        while (this.self.context.hasNext()) {
            var node = new Hatena_SectionNode();
            node._new({ context: c });
            node.parse();
        }
    }
});


Hatena_BrNode = function(){};
Hatena_BrNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        var l = c.next();
        if (l.length != 0) {
            return;
        }
        var t = String.times(c.indentStr, c.indent);
        if (c.getLastPut() == t + "<br>" || c.getLastPut() == t) {
            c.putLine("<br>");
        } else {
            c.putLine("");
        }
    }
});


Hatena_CDataNode = function(){};
Hatena_CDataNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        c.putLine(c.next());
    }
});


Hatena_DlNode = function(){};
Hatena_DlNode.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^\:((?:<[^>]+>|\[\].+?\[\]|\[[^\]]+\]|\[\]|[^\:<\[]+)+)\:(.+)$/;
    },

    parse : function(){
        var c = this.self.context;
        var l = c.peek();
        if(!l.match(this.self.pattern)) return;
        this.self.llevel = RegExp.$1.length;

        c.putLine("<dl>");
        c.indent(function() {
            while (l = c.peek()) {
                if(!l.match(this.self.pattern)) break;
                c.next();
                c.putLine("<dt>" + RegExp.$1 + "</dt>");
                c.putLine("<dd>" + RegExp.$2 + "</dd>");
            }
        });
        c.putLine("</dl>");
    }
});


Hatena_FootnoteNode = function(){};
Hatena_FootnoteNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        if (c.footnotes().length == 0) {
            return;
        }

        c.putLine('<div class="footnote">');
        c.indent(function() {
            for (var i = 0; i < c.self.footnotes.length; i++) {
                var n = i + 1;
                var l = '<p class="footnote"><a href="#fn' + n + '" name="f' + n + '">*' +
                    n + '</a>: ' + c.self.footnotes[i] + '</p>';
                c.putLine(l);
            }
        });
        c.putLine('</div>');
    }
});


Hatena_H4Node = function(){};
Hatena_H4Node.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^\*((?:[^\*]).*)$/;
    },

    parse : function(){
        var c = this.self.context;
        var l = c.next();
        if (l == null) {
            return;
        }
        if (!l.match(this.self.pattern)) {
            return;
        }
        c.putLine("<h4>" + RegExp.$1 + "</h4>");
    }
});


Hatena_H5Node = function(){};
Hatena_H5Node.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^\*\*((?:[^\*]).*)$/;
    },

    parse : function(){
        var c = this.self.context;
        var l = c.next();
        if (l == null) {
            return;
        }
        if (!l.match(this.self.pattern)) {
            return;
        }
        c.putLine("<h5>" + RegExp.$1 + "</h5>");
    }
});


Hatena_H6Node = function(){};
Hatena_H6Node.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^\*\*\*((?:[^\*]).*)$/;
    },

    parse : function(){
        var c = this.self.context;
        var l = c.next();
        if (l == null) {
            return;
        }
        if (!l.match(this.self.pattern)) {
            return;
        }
        c.putLine("<h6>" + RegExp.$1 + "</h6>");
    }
});


Hatena_ListNode = function(){};
Hatena_ListNode.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^([\-\+]+)([^>\-\+].*)$/;
    },

    parse : function(){
        var _self = this.self;
        var c = _self.context;
        var l = c.peek();
        if(!l.match(_self.pattern)) return;
        _self.llevel = RegExp.$1.length;
        _self.type = RegExp.$1.substr(0, 1) == '-' ? 'ul' : 'ol';

        c.indent(function() {
            c.putLine("<" + _self.type + ">");
                while (l = c.peek()) {
                    if(!l.match(_self.pattern)) break;
                    if (RegExp.$1.length > _self.llevel) {
                        var node = new Hatena_ListNode();
                        node._new({ context : _self.context });
                        node.parse();
                    } else if(RegExp.$1.length < _self.llevel) {
                        break;
                    } else {
                        l = c.next();
                        c.indent(function() {
                            c.putLine("<li>" + RegExp.$2 + "</li>");
                        });
                    }
                }
            c.putLine("</" + _self.type + ">");
        }, _self.llevel - 1);
    }
});


Hatena_PNode = function(){};
Hatena_PNode.prototype = Object.extend(new Hatena_Node(), {
    parse :function(){
        var c = this.self.context;
        c.putLine("<p>" + c.next() + "</p>");
    }
});


Hatena_PreNode = function(){};
Hatena_PreNode.prototype = Object.extend(new Hatena_Node(), {
    init: function(){
        this.self.pattern = /^>\|$/;
        this.self.endpattern = /(.*)\|<$/;
        this.self.startstring = "<pre>"; // TODO add <code> and </code>
        this.self.endstring = "</pre>";
    },

    parse: function(){ // modified by edvakf
        var c = this.self.context;
        var ss = this.self.startstring;
        var m;
        if(!(m = c.peek().match(this.self.pattern))) return;
        c.next();
        c.putLine(m[1] ? ss.replace('>',' class="prettyprint ' + m[1] + '">') : ss);
        var x = '';
        while (c.hasNext()) {
            var l = c.peek();
            if (l.match(this.self.endpattern)) {
                x = RegExp.$1;
                c.next();
                break;
            }
            c.putLineWithoutIndent(this.escape_pre(c.next()));
        }
        c.putLineWithoutIndent(x + this.self.endstring);
    },

    escape_pre: function(text) {
        return text;
    }
});


Hatena_SuperpreNode = function(){};
Hatena_SuperpreNode.prototype = Object.extend(new Hatena_PreNode(), {
    init: function() {
        this.self.pattern = /^>\|(\S*)\|$/; // modified by edvakf
        this.self.endpattern = /^\|\|<$/;
        this.self.startstring = "<pre>";
        this.self.endstring = "</pre>";
    },

    escape_pre: function(s) {
        return String._escapeHTML(s);
    }
});


Hatena_TableNode = function(){};
Hatena_TableNode.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^\|([^\|]*\|(?:[^\|]*\|)+)$/;
    },

    parse : function(s){
        var _self = this.self;
        var c = _self.context;
        var l = c.peek();
        if (!l.match(_self.pattern)) {
            return;
        }

        c.putLine("<table>");
        c.indent(function() {
            while (l = c.peek()) {
                if (!l.match(_self.pattern)) {
                    break;
                }
                l = c.next();
                c.putLine("<tr>");
                var td = l.split("|");
                td.pop();
                td.shift();
                c.indent(function() {
                    for (var i = 0; i < td.length; i++) {
                        var item = td[i];
                        if (item.match(/^\*(.*)/)) {
                            c.putLine("<th>" + RegExp.$1 + "</th>");
                        } else {
                            c.putLine("<td>" + item + "</td>");
                        }
                    }
                });
                c.putLine("</tr>");
            }
        });
        c.putLine("</table>");
    }
});


Hatena_SectionNode = function(){};
Hatena_SectionNode.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.childnode = ["h6", "h5", "h4", "blockquote", "dl", "list", "pre", "superpre", "table", "tagline", "tag"];
        this.self.startstring = '<div class="section">';
        this.self.endstring = '</div>';
        this.self.child_node_refs = Array();
    },

    parse : function(){
        var _this = this;
        var c = _this.self.context;
        _this._set_child_node_refs();
        c.putLine(_this.self.startstring);
        c.indent(function() {
            while (c.hasNext()) {
                var l = c.peek();
                var node = _this._findnode(l);
                if(node == null) return;
                // TODO: ref == instanceof ???
                //if (ref(node) eq 'Hatena_H3Node') {
                //  if(this.self.started++) break;
                //}
                node.parse();
            }
        });
        c.putLine(_this.self.endstring);
    },

    _set_child_node_refs : function(){
        var _self = this.self;
        var c = _self.context;
        c.indent(function() {
            for(var i = 0; i < _self.childnode.length; i++) {
                var node = _self.childnode[i];
                var mod = 'Hatena_' + node.charAt(0).toUpperCase() + node.substr(1).toLowerCase() + 'Node';
                var n = eval("new "+ mod +"()");
                n._new({ context: c });
                _self.child_node_refs.push(n);
            }
        });
    },

    _findnode : function(l){
        var _self = this.self;
        var c = _self.context;

        for (var i = 0; i < _self.child_node_refs.length; i++) {
            var node = _self.child_node_refs[i];
            var pat = node.self.pattern;
            if (pat == null) {
                continue;
            }
            if (l.match(pat)) {
                return node;
            }
        }
        
        if (l.length == 0) {
            var node = new Hatena_BrNode({ context: c });
            node._new({ context: c });
            return node;
        } else if (c.noparagraph()) {
            var node = new Hatena_CDataNode();
            node._new({ context: c });
            return node;
        } else {
            var node = new Hatena_PNode;
            node._new({ context: c });
            return node;
        }
    }
});


// modified by edvakf
Hatena_BlockquoteNode = function(){};
Hatena_BlockquoteNode.prototype = Object.extend(new Hatena_SectionNode(), {
    init : function(){
        this.self.pattern = /^>(?:(https?:\/\/.*?)(:title(=.+)?)?)?>$/; // modified by edvakf
        this.self.endpattern = /^<<$/;
        this.self.childnode = ["h4", "h5", "h6", "blockquote", "dl", "list", "pre", "superpre", "table"];//, "tagline", "tag"];
        this.self.startstring = "<blockquote>";
        this.self.endstring = "</blockquote>";
        this.self.child_node_refs = Array();
    },

    parse : function(){
        var _this = this;
        var c = _this.self.context;
        var m;
        if(!(m = c.peek().match(_this.self.pattern))) return;
        if (m[1]) { // m[1] is the url (added by edvakf)
            var title = String._escapeHTML(m[3] ? m[3].substr(1) : // if title given, then use it
                m[2] ? '{{title}}' :  // else if title not given, fetch from YQL
                m[1]);                // else, use URL
            _this.self.startstring = _this.self.startstring.replace('>', ' cite="' + m[1] + '" title="' + title + '">');
            var cite = '<cite><a href="' + m[1] + '">' + title + '</a></cite>';
        } else {
            var cite = '';
        }
        c.next();
        _this._set_child_node_refs();
        c.putLine(_this.self.startstring);
        c.indent(function() {
            while (c.hasNext()) {
                var l = c.peek();
                if (l.match(_this.self.endpattern)) {
                    c.next();
                    break;
                }
                var node = _this._findnode(l);
                if(node == null) break;
                node.parse();
            }
        });
        c.putLine(cite + _this.self.endstring);
    }
});


Hatena_TagNode = function(){};
Hatena_TagNode.prototype = Object.extend(new Hatena_SectionNode(), {
    init : function(){
        this.self.pattern = /^>(<.*)$/;
        this.self.endpattern = /^(.*>)<$/;
        this.self.childnode = ["h4", "h5", "h6", "blockquote", "dl", "list", "pre", "superpre", "table"];
        this.self.child_node_refs = Array();
    },

    parse : function(){
        var c = this.self.context;
        if(!c.peek().match(this.self.pattern)) return;
        c.next();
        c.noparagraph(1);
        this._set_child_node_refs();
        c.putLine(RegExp.$1);
        c.indent(function() {
            while (c.hasNext()) {
                var l = c.peek();
                if (l.match(this.self.endpattern)) {
                    c.next();
                    c.putLine(RegExp.$1);
                    break;
                }
                var node = this._findnode(l);
                if(node == null) break;
                node.parse();
            }
        });
        c.noparagraph(0);
    }
});


Hatena_TaglineNode = function(){};
Hatena_TaglineNode.prototype = Object.extend(new Hatena_SectionNode(), {
    init : function(){
        this.self.pattern = /^>(<.*>)<$/;
        this.self.child_node_refs = Array();
    },

    parse : function(){
        var c = this.self.context;
        if(!c.peek().match(this.self.pattern)) return;
        c.next();
        c.putLine(RegExp.$1);
    }
});
