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
        html : '',
        ilevel : args["ilevel"] || 0,
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
        node._new({
            context: c,
            ilevel: this.self.ilevel
        });
        node.parse();

        this.self.afterFilter(c);

        this.self.html = c.html();
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
};


Hatena_Context = function(args){
    this.self = {
        text : args["text"],
        _htmllines : [],
        footnotes : [],
        noparagraph : 0,
        aliases: {},
    };
    this.init();
};
Hatena_Context.prototype = {
    init : function() {
        // this.text(this.self.text);
        this.self.text = this.self.text.replace(/\r/g, "");
        this.self.lines = this.self.text.split('\n');
        this.self.index = -1;
    },

    hasNext : function() {
        return (this.self.lines != null && this.self.lines.length - 1 > this.self.index);
    },

    peek : function() {
        return this.self.lines[this.self.index + 1];
    },

    next : function() {
        return this.self.lines[++this.self.index];
    },

    text : function(text) {
        if (text == null) {
            return this.self.text;
        }
        this.self.text = text.replace(/\r/g, "");
        this.self.lines = this.self.text.split('\n');
        this.self.index = -1;
    },

    html : function(html) {
        if (html != null) {
            this.self._htmllines = html.split("\n");
        }
        return this.self._htmllines.join ("\n");
    },

    htmllines : function(line) {
        if(line != null) this.self._htmllines.push(line);
        return this.self._htmllines;
    },

    lasthtmlline : function() {
        return this.self._htmllines[this.self._htmllines.length - 1];
    },

    footnotes : function(line) {
        if(line != null) this.self.footnotes.push(line);
        return this.self.footnotes;
    },

    noparagraph : function(noparagraph) {
        if(noparagraph != null) this.self.noparagraph = noparagraph;
        return this.self.noparagraph;
    },

    aliases: function(id, url) {
        if (url != null) {
            this.self.aliases[id] =  { url: url };
        }
        return this.self.aliases[id];
    }
};


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


Hatena_BodyNode = function(){};
Hatena_BodyNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        while (this.self.context.hasNext()) {
            var node = new Hatena_SectionNode();
            node._new({
                context : c,
                ilevel : this.self.ilevel
            });
            node.parse();
        }
    }
});


Hatena_BrNode = function(){};
Hatena_BrNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        var l = c.next();
        if(l.length != 0) return;
        var t = String.times("    ", this.self.ilevel);
        if (c.lasthtmlline() == t + "<br>" || c.lasthtmlline() == t) {
            c.htmllines(t + "<br>");
        } else {
            c.htmllines(t);
        }
    }
});


Hatena_CDataNode = function(){};
Hatena_CDataNode.prototype = Object.extend(new Hatena_Node(), {
    parse : function(){
        var c = this.self.context;
        var t = String.times("    ", this.self.ilevel);
        var l = c.next();
        var text = new Hatena_Text();
        text._new({context : c});
        text.parse(l);
        l = text.html();
        c.htmllines(t + l);
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
        var t = String.times("    ", this.self.ilevel);

        c.htmllines(t + "<dl>");
        while (l = c.peek()) {
            if(!l.match(this.self.pattern)) break;
            c.next();
            c.htmllines(t + "    <dt>" + RegExp.$1 + "</dt>");
            c.htmllines(t + "    <dd>" + RegExp.$2 + "</dd>");
        }
        c.htmllines(t + "</dl>");
    }
});


Hatena_FootnoteNode = function(){};
Hatena_FootnoteNode.prototype = Object.extend(new Hatena_Node(), {
    html : "",

    parse : function(){
        var c = this.self["context"];
        if(c.self.footnotes == null || c.self.footnotes.length == 0) return;
        var t = String.times("    ", this.self["ilevel"]);
        this.self["html"] = '';

        this.self.html += t + '<div class="footnote">\n';
        var num = 0;
        var text = new Hatena_Text();
        text._new({context : c});
        for(var i = 0; i < c.self.footnotes.length; i++) {
            var note = c.self.footnotes[i];
            num++;
            text.parse(note);
            var l = t + '    <p class="footnote"><a href="#fn' + num + '" name="f' + num + '">*' + num + '</a>: '
                + text.html() + '</p>';
            this.self["html"] += l + "\n";
        }
        this.self["html"] += t + '</div>\n';
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
        if(l == null) return;
        if(!l.match(this.self.pattern)) return;
        var t = String.times("    ", this.self.ilevel);
        c.htmllines(t + "<h4>" + RegExp.$1 + "</h4>");
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
        if(l == null) return;
        if(!l.match(this.self.pattern)) return;
        var t = String.times("    ", this.self.ilevel);
        c.htmllines(t + "<h5>" + RegExp.$1 + "</h5>");
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
        if(l == null) return;
        if(!l.match(this.self.pattern)) return;
        var t = String.times("    ", this.self.ilevel);
        c.htmllines(t + "<h6>" + RegExp.$1 + "</h6>");
    }
});


Hatena_ListNode = function(){};
Hatena_ListNode.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^([\-\+]+)([^>\-\+].*)$/;
    },

    parse : function(){
        var c = this.self.context;
        var l = c.peek();
        if(!l.match(this.self.pattern)) return;
        this.self.llevel = RegExp.$1.length;
        var t = String.times("    ", this.self.ilevel + this.self.llevel - 1);
        this.self.type = RegExp.$1.substr(0, 1) == '-' ? 'ul' : 'ol';

        c.htmllines(t + "<" + this.self.type + ">");
        while (l = c.peek()) {
            if(!l.match(this.self.pattern)) break;
            if (RegExp.$1.length > this.self.llevel) {
                //c.htmllines(t + "    <li>"); bug??
                var node = new Hatena_ListNode();
                node._new({
                    context : this.self.context,
                    ilevel : this.self.ilevel
                });
                node.parse();
                //c.htmllines(t + "    </li>"); bug??
            } else if(RegExp.$1.length < this.self.llevel) {
                break;
            } else {
                l = c.next();
                c.htmllines(t + "    <li>" + RegExp.$2 + "</li>");
            }
        }
        c.htmllines(t + "</" + this.self.type + ">");
    }
});


Hatena_PNode = function(){};
Hatena_PNode.prototype = Object.extend(new Hatena_Node(), {
    parse :function(){
        var c = this.self.context;
        var t = String.times("    ", this.self.ilevel);
        var l = c.next();
        var text = new Hatena_Text();
        text._new({context : c});
        text.parse(l);
        l = text.html();
        c.htmllines(t + "<p>" + l + "</p>");
    }
});


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
        if(!(m = c.peek().match(this.self.pattern))) return;
        c.next();
        var t = String.times("    ", this.self.ilevel);
        c.htmllines(t + (m[1] ? 
            // add class for syntax highlight
            this.self.startstring.replace('>',' class="prettyprint ' + m[1] + '">') :
            this.self.startstring));
        var x = '';
        while (c.hasNext()) {
            var l = c.peek();
            if (l.match(this.self.endpattern)) {
                var x = RegExp.$1;
                c.next();
                break;
            }
            c.htmllines(this.escape_pre(c.next()));
        }
        c.htmllines(x + this.self.endstring);
    },

    escape_pre : function(text){ return text; }
});


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
});


Hatena_TableNode = function(){};
Hatena_TableNode.prototype = Object.extend(new Hatena_Node(), {
    init : function(){
        this.self.pattern = /^\|([^\|]*\|(?:[^\|]*\|)+)$/;
    },

    parse : function(s){
        var c = this.self.context;
        var l = c.peek();
        if(!l.match(this.self.pattern)) return;
        var t = String.times("    ", this.self.ilevel);

        c.htmllines(t + "<table>");
        while (l = c.peek()) {
            if(!l.match(this.self.pattern)) break;
            l = c.next();
            c.htmllines(t + "    <tr>");
            var td = l.split("|");
            td.pop(); td.shift();
            for (var i = 0; i < td.length; i++) {
                var item = td[i];
                if (item.match(/^\*(.*)/)) {
                    c.htmllines(t + "        <th>" + RegExp.$1 + "</th>");
                } else {
                    c.htmllines(t + "        <td>" + item + "</td>");
                }
            }
            c.htmllines(t + "    </tr>");
        }
        c.htmllines(t + "</table>");
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
        var c = this.self.context;
        var t = String.times("    ", this.self.ilevel);
        this._set_child_node_refs();
        c.htmllines(t + this.self.startstring);
        while (c.hasNext()) {
            var l = c.peek();
            var node = this._findnode(l);
            if(node == null) return;
            // TODO: ref == instanceof ???
            //if (ref(node) eq 'Hatena_H3Node') {
            //  if(this.self.started++) break;
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
        for(var i = 0; i <  this.self.childnode.length; i++) {
            var node = this.self.childnode[i];
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
        var c = this.self.context;
        var m;
        if(!(m = c.peek().match(this.self.pattern))) return;
        if (m[1]) { // m[1] is the url (added by edvakf)
            var title = String._escapeHTML(m[3] ? m[3].substr(1) : // if title given, then use it
                m[2] ? '{{title}}' :  // else if title not given, fetch from YQL
                m[1]);                // else, use URL
            this.self.startstring = this.self.startstring.replace('>', ' cite="' + m[1] + '" title="' + title + '">');
            var cite = '<cite><a href="' + m[1] + '">' + title + '</a></cite>';
        } else {
            var cite = '';
        }
        c.next();
        var t = String.times("    ", this.self.ilevel);
        this._set_child_node_refs();
        c.htmllines(t + this.self.startstring);
        while (c.hasNext()) {
            var l = c.peek();
            if (l.match(this.self.endpattern)) {
                c.next();
                break;
            }
            var node = this._findnode(l);
            if(node == null) break;
            node.parse();
        }
        c.htmllines(t + cite + this.self.endstring);
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
        var t = String.times("    ", this.self.ilevel);
        if(!c.peek().match(this.self.pattern)) return;
        c.next();
        c.noparagraph(1);
        this._set_child_node_refs();
        var x =this._parse_text(RegExp.$1);
        c.htmllines(t + x);
        while (c.hasNext()) {
            var l = c.peek();
            if (l.match(this.self.endpattern)) {
                c.next();
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
});


Hatena_TaglineNode = function(){};
Hatena_TaglineNode.prototype = Object.extend(new Hatena_SectionNode(), {
    init : function(){
        this.self.pattern = /^>(<.*>)<$/;
        this.self.child_node_refs = Array();
    },

    parse : function(){
        var c = this.self.context;
        var t = String.times("    ", this.self.ilevel);
        if(!c.peek().match(this.self.pattern)) return;
        c.next();
        c.htmllines(t + RegExp.$1);
    }
});


Hatena_Text = function(){};
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
};


/*var h = new Hatena();
h.parse("hoge((a))aaa))aaaa\n><a>hoge</a><aaa");
WScript.echo(h.html());
*/
