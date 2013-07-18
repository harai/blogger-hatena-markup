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

String._escapeInsidePre = function(s){
    s = s.replace(/\&/g, "&amp;");
    s = s.replace(/</g, "&lt;");
    s = s.replace(/>/g, "&gt;");
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
        var text = c.getInputText();

        var aliases = function() {
            text = text.replace(/\[alias:([\w-]+):(https?:\/\/[^\]\s]+?)\]\n?/mg, function($0, $1, $2) {
                c.addAlias($1, $2);
                return "";
            });
        };

        var insertImages = function() {
            text = text.replace(/\[gimage:([\w-]+)(?::([^\]]+))?\]/g, function($0, id, prop) {
                var props = prop.split(/,/);
                var size = props[0];
                var pos = props[1] || null;
                var alias = c.getAlias(id);
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

        c.setInputText(text);
    };
    
    var afterFilter = function(c) {
        var html = "";
        var text = c.getResult();

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
                    c.addFootnote(note);
                    var num = c.getFootnotes().length;
                    note = note.replace(/<.*?>/g, "");
                    note = note.replace(/&/g, "&amp;");
                    html += '<span class="footnote"><a href="#f' + num + '" title="' + note +
                        '" name="fn' + num + '">*' + num + '</a></span>' + post;
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

        c.replaceResult(html);
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

        var node = new Hatena_SectionNode();
        node._new({ context: c });
        node.parse();

        this.self.afterFilter(c);

        if (this.self.context.getFootnotes().length != 0) {
            var node = new Hatena_FootnoteNode();
            node._new({ context : c });
            node.parse();
        }

        return c.getResult();
    }
};


Hatena_Context = function(args){
    this.self = {
        text : args["text"],
        resultLines : [],
        footnotes : [],
        noparagraph : false,
        aliases: {},
        indent: 0,
        indentStr: "    ",
    };
    this.init();
};
Hatena_Context.prototype = {
    init: function() {
        this.setInputText(this.self.text);
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

    setInputText: function(text) {
        this.self.text = text.replace(/\r/g, "");
        this.self.lines = this.self.text.split('\n');
        this.self.index = -1;
    },

    getInputText: function() {
        return this.self.text;
    },

    getResult: function() {
        return this.self.resultLines.join("\n");
    },

    replaceResult: function(resultStr) {
        this.self.resultLines = resultStr.split("\n");
    },

    putLine: function(line) {
        var iStr = String.times(this.self.indentStr, this.self.indent);
        this.self.resultLines.push(iStr + line);
    },

    putLineWithoutIndent: function(line) {
        this.self.resultLines.push(line);
    },

    getLastPut: function() {
        return this.self.resultLines[this.self.resultLines.length - 1];
    },

    addFootnote: function(line) {
        this.self.footnotes.push(line);
    },

    getFootnotes: function() {
        return this.self.footnotes;
    },

    isParagraphSuppressed: function() {
        return this.self.noparagraph;
    },

    suppressParagraph: function(b) {
        this.self.noparagraph = b;
    },

    getAlias: function(id) {
        return this.self.aliases[id];
    },

    addAlias: function(id, url) {
        this.self.aliases[id] =  { url: url };
    },

    indent: function(f, num) {
        var n = (num == null) ? 1 : num;
        this.self.indent += n;
        var res = f();
        this.self.indent -= n;
        return res;
    }
};


Hatena_Node = function() {};
Hatena_Node.prototype = {
    pattern: "",

    _new: function(args) {
        if (args == null) {
            args = [];
        }
        this.self = { context: args["context"] };
        this.init();
    },
    init: function() {
        this.self.pattern = '';
    },

    parse: function() {
        alert('die');
    },

    context: function(v) {
        this.self.context = v;
    }
};


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
            c.putLineWithoutIndent("");
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
        var _self = this.self;
        var c = _self.context;
        var l = c.peek();
        if (!l.match(_self.pattern)) {
            return;
        }

        c.putLine("<dl>");
        c.indent(function() {
            while (l = c.peek()) {
                if (!l.match(_self.pattern)) {
                    break;
                }
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
        if (c.getFootnotes().length == 0) {
            return;
        }

        c.putLine('<div class="footnote">');
        c.indent(function() {
            var footnotes = c.getFootnotes();
            for (var i = 0; i < footnotes.length; i++) {
                var n = i + 1;
                var l = '<p class="footnote"><a href="#fn' + n + '" name="f' + n + '">*' +
                    n + '</a>: ' + footnotes[i] + '</p>';
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
        if (!c.peek().match(_self.pattern)) {
            return;
        }
        var llevel = RegExp.$1.length;
        var listType = RegExp.$1.substr(0, 1) == '-' ? 'ul' : 'ol';

        c.putLine("<" + listType + ">");
        var l;
        c.indent(function() {
            while (l = c.peek()) {
                var m;
                if (!(m = l.match(_self.pattern))) {
                    break;
                }
                if (m[1].length > llevel) {
                    c.indent(function() {
                        var node = new Hatena_ListNode();
                        node._new({ context : c });
                        node.parse();
                    });
                    c.putLine("</li>");
                } else if (m[1].length < llevel) {
                    break;
                } else {
                    c.next();
                    var entry = m[2];
                    var l2, m2;
                    if ((l2 = c.peek()) && (m2 = l2.match(_self.pattern)) && m2[1].length > llevel) {
                        c.putLine("<li>" + m[2]);
                    } else {
                        c.putLine("<li>" + m[2] + "</li>");
                    }
                }
            }
        });
        c.putLine("</" + listType + ">");
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
        return String._escapeInsidePre(s);
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


Hatena_SectionNode = function() {};
Hatena_SectionNode.prototype = Object.extend(new Hatena_Node(), {
    init: function() {
        this.self.childnode = ["h6", "h5", "h4", "blockquote", "dl", "list", "pre", "superpre", "table", "tagline", "tag"];
        this.self.child_node_refs = Array();
    },

    parse: function() {
        var _this = this;
        var c = _this.self.context;
        _this._set_child_node_refs();
        while (c.hasNext()) {
            var l = c.peek();
            var node = _this._findnode(l);
            if (node == null) {
                return;
            }
            node.parse();
        }
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
        } else if (c.isParagraphSuppressed()) {
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
        this.self.pattern = /^>(?:(https?:\/\/.*?)(:.*)?)?>$/; // modified by edvakf
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
        if (!(m = c.peek().match(_this.self.pattern))) {
            return;
        }
        var cite = null;
        if (m[1]) {
            var url = m[1];
            var title = String._escapeHTML(m[2] ? m[2].substr(1) : url);
            _this.self.startstring = _this.self.startstring.replace('>', ' title="' + title + '" cite="' + url + '">');
            cite = '<cite><a href="' + url + '">' + title + '</a></cite>';
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
            if (cite) {
                c.putLine(cite);
            }
        });
        c.putLine(_this.self.endstring);
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
        var _this = this;
        var _self = _this.self;
        var c = _self.context;
        if (!c.peek().match(_self.pattern)) {
            return;
        }
        c.next();
        c.suppressParagraph(true);
        _this._set_child_node_refs();
        c.putLine(RegExp.$1);
        while (c.hasNext()) {
            var l = c.peek();
            if (l.match(_self.endpattern)) {
                c.next();
                c.putLine(RegExp.$1);
                break;
            }
            var node = _this._findnode(l);
            if (node == null) {
                break;
            }
            c.indent(function() {
                node.parse();
            });
        }
        c.suppressParagraph(false);
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
