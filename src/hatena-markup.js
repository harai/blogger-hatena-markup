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
    s = s.replace(/\'/g, "&#39;");
    s = s.replace(/\\/g, "&#92;");
    return s;
};

String._escapeInsideLink = function(s) {
    s = s.replace(/\[/g, "&#91;");
    s = s.replace(/\]/g, "&#93;");
    s = s.replace(/\(\(/g, "&#40;&#40;");
    s = s.replace(/\)\)/g, "&#41;&#41;");
    s = s.replace(/\n/, "");
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
    this.self = {
        doc: args.doc
    }
};
Hatena.prototype = {
    parse: function(text) {
        var c = new Hatena_Context({
            text: text,
            doc: this.self.doc
        });

        Hatena_AliasNode.registerAliases(text, c);

        var node = new Hatena_SectionNode();
        node._new({ context: c });
        node.parse();

        if (c.getFootnotes().length != 0) {
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
        doc: args["doc"],
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

    getResult: function() {
        return this.self.resultLines.join("\n");
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
    },

    getDocument: function() {
        return this.self.doc;
    },
};


Hatena_Node = function() {};
Hatena_Node.prototype = {
    pattern: "",

    _new: function(args) {
        if (args == null) {
            args = [];
        }
        this.self = { context: args["context"] };
    },

    parse: function() {
        alert('die');
    },
};


Hatena_AliasNode = function() {};
Hatena_AliasNode.registerAliases = function(text, context) {
    text.replace(/\[alias:([\w-]+):(https?:\/\/[^\]\s]+?)\]/mg, function($0, $1, $2) {
        context.addAlias($1, $2);
        return "";
    });
};
Hatena_AliasNode.replaceAliasesInLine = function(text) {
    return text.replace(/\[alias:([\w-]+):(https?:\/\/[^\]\s]+?)\]/g, function($0, $1, $2) {
        return "";
    });
};
Hatena_AliasNode.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^\[alias:([\w-]+):(https?:\/\/[^\]\s]+?)\]\s*$/,

    parse: function() {
        var c = this.self.context;
        c.next();
    }
});


Hatena_LinkNode = {
    replaceLinksInLine: function(text) {
        return text.replace(/\[(https?:\/\/[^\]\s]+?)(?::([^\]\n]*))?\]/g, function($0, url, str) {
            return '<a href="' + String._escapeHTML(url) + '">' + (str ? str : url) + '</a>';
        });
    },
};


Hatena_InLine = {
    parseFootnotePart: function(text, context) {
        text = Hatena_GimageNode.replaceGimagesInLine(text, context);
        return Hatena_LinkNode.replaceLinksInLine(text);
    },

    parsePart: function(text, context) {
        var fragments = Hatena_FootnoteNode.parseFootnotesInLine(text, context);
        return fragments.map(function(f) {
            if (!f.parseMore) {
                return f.text;
            }
            var text = f.text;
            text = Hatena_AliasNode.replaceAliasesInLine(text);
            return Hatena_InLine.parseFootnotePart(text, context);
        }).join("");
    }
};


Hatena_BrNode = function() {};
Hatena_BrNode.prototype = Object.extend(new Hatena_Node(), {
    parse: function() {
        var c = this.self.context;
        var l = c.next();
        if (l.length != 0) {
            return;
        }
        var t = String.times(c.indentStr, c.indent);
        if (c.getLastPut() == t + "<br />" || c.getLastPut() == t) {
            c.putLine("<br />");
        } else {
            c.putLineWithoutIndent("", true);
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
    pattern: /^\:((?:<[^>]+>|\[\].+?\[\]|\[[^\]]+\]|\[\]|[^\:<\[]+)+)\:(.+)$/,

    parse: function() {
        var _this = this;
        var c = this.self.context;

        c.putLine("<dl>");
        c.indent(function() {
            var m = null;
            while (c.hasNext() && (m = c.peek().match(_this.pattern))) {
                c.next();
                c.putLine("<dt>" + Hatena_InLine.parsePart(m[1], c) + "</dt>");
                c.putLine("<dd>" + Hatena_InLine.parsePart(m[2], c) + "</dd>");
            }
        });
        c.putLine("</dl>");
    }
});


Hatena_FootnoteNode = function(){};
Hatena_FootnoteNode.parseFootnotesInLine = function(text, context) {
    var foot = text.split("((");
    var resultFragments = [];
    var tempFragment = "";
    for (var i = 0; i < foot.length; i++) {
        if (i == 0) {
            tempFragment += foot[i];
            continue;
        }
        var s = foot[i].split("))", 2);
        if (s.length != 2) {
            tempFragment += "((" + foot[i];
            continue;
        }
        var pre = foot[i - i];
        var note = s[0];
        var post = foot[i].substr(s[0].length + 2);
        if (pre.match(/\)$/) && post.match(/^\(/)) {
            tempFragment += "((" + post;
        } else {
            context.addFootnote(note);
            var num = context.getFootnotes().length;
            note = Hatena_InLine.parseFootnotePart(note);
            note = note.replace(/<.*?>/g, "");
            resultFragments.push({ parseMore: true, text: tempFragment });
            var footnoteStr = '<span class="footnote"><a href="#f' + num + '" title="' + String._escapeHTML(note) +
                '" name="fn' + num + '">*' + num + '</a></span>';
            resultFragments.push({ parseMore: false, text: footnoteStr });
            tempFragment = post;
        }
    }
    if (tempFragment !== "") {
        resultFragments.push({ parseMore: true, text: tempFragment });
    }
    return resultFragments;
};
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
                    n + '</a>: ' + Hatena_InLine.parseFootnotePart(footnotes[i], c) + '</p>';
                c.putLine(l);
            }
        });
        c.putLine('</div>');
    }
});


Hatena_H4Node = function(){};
Hatena_H4Node.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^\*((?:[^\*]).*)$/,

    parse: function(match) {
        var c = this.self.context;
        c.next();
        c.putLine("<h4>" + Hatena_InLine.parsePart(match[1], c) + "</h4>");
    }
});


Hatena_H5Node = function(){};
Hatena_H5Node.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^\*\*((?:[^\*]).*)$/,

    parse: function(match) {
        var c = this.self.context;
        c.next();
        c.putLine("<h5>" + Hatena_InLine.parsePart(match[1], c) + "</h5>");
    }
});


Hatena_H6Node = function(){};
Hatena_H6Node.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^\*\*\*((?:[^\*]).*)$/,

    parse: function(match) {
        var c = this.self.context;
        c.next();
        c.putLine("<h6>" + Hatena_InLine.parsePart(match[1], c) + "</h6>");
    }
});


Hatena_ListNode = function(){};
Hatena_ListNode.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^([\-\+]+)([^>\-\+].*)$/,

    parse: function(match) {
        var _this = this;
        var c = _this.self.context;
        var llevel = match[1].length;
        var listType = match[1].substr(0, 1) == '-' ? 'ul' : 'ol';

        c.putLine("<" + listType + ">");
        var l;
        c.indent(function() {
            while (l = c.peek()) {
                var m;
                if (!(m = l.match(_this.pattern))) {
                    break;
                }
                if (m[1].length == llevel) {
                    c.next();
                    var entry = m[2];
                    var l2, m2;
                    if ((l2 = c.peek()) && (m2 = l2.match(_this.pattern)) && m2[1].length > llevel) {
                        c.putLine("<li>" + Hatena_InLine.parsePart(m[2], c));
                    } else {
                        c.putLine("<li>" + Hatena_InLine.parsePart(m[2], c) + "</li>");
                    }
                } else if (m[1].length > llevel) {
                    c.indent(function() {
                        var node = new Hatena_ListNode();
                        node._new({ context : c });
                        node.parse(m);
                    });
                    c.putLine("</li>");
                } else {
                    break;
                }
            }
        });
        c.putLine("</" + listType + ">");
    }
});


Hatena_PNode = function(){};
Hatena_PNode.prototype = Object.extend(new Hatena_Node(), {
    parse: function(){
        var c = this.self.context;
        c.putLine("<p>" + Hatena_InLine.parsePart(c.next(), c) + "</p>");
    }
});


Hatena_PreNode = function(){};
Hatena_PreNode.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^>\|$/,
    endPattern: /(.*)\|<$/,

    parse: function(match) {
        var c = this.self.context;
        c.next();
        c.putLine("<pre>");
        var lastLine = "";
        while (c.hasNext()) {
            var l = c.peek();
            var m;
            if (m = l.match(this.endPattern)) {
                lastLine = m[1];
                c.next();
                break;
            }
            c.putLineWithoutIndent(Hatena_InLine.parsePart(c.next(), c));
        }
        c.putLineWithoutIndent(Hatena_InLine.parsePart(lastLine, c) + "</pre>");
    }
});


Hatena_SuperpreNode = function(){};
Hatena_SuperpreNode.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^>\|(\S*)\|$/,
    endPattern: /^\|\|<$/,

    parse: function(match) {
        var c = this.self.context;
        c.next();
        c.putLine(match[1] !== "" ? '<pre class="prettyprint ' + match[1] + '">' : "<pre>"); // TODO add <code> and </code>
        while (c.hasNext()) {
            if (c.peek().match(this.endPattern)) {
                c.next();
                break;
            }
            c.putLineWithoutIndent(String._escapeInsidePre(c.next()));
        }
        c.putLineWithoutIndent("</pre>");
    }
});


Hatena_TableNode = function(){};
Hatena_TableNode.prototype = Object.extend(new Hatena_Node(), {
    pattern: /^\|([^\|]*\|(?:[^\|]*\|)+)$/,

    parse: function() {
        var _this = this;
        var c = _this.self.context;

        c.putLine("<table>");
        c.indent(function() {
            while (c.hasNext()) {
                if (!c.peek().match(_this.pattern)) {
                    break;
                }
                var l = c.next();
                c.putLine("<tr>");
                var td = l.split("|");
                td.pop();
                td.shift();
                c.indent(function() {
                    for (var i = 0; i < td.length; i++) {
                        var item = td[i];
                        if (item.match(/^\*(.*)/)) {
                            c.putLine("<th>" + Hatena_InLine.parsePart(RegExp.$1, c) + "</th>");
                        } else {
                            c.putLine("<td>" + Hatena_InLine.parsePart(item, c) + "</td>");
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
    childNodes: ["h6", "h5", "h4", "blockquote", "dl", "list", "pre", "superpre", "table", "tagline", "tag",
        "gimage", "alias"],

    parse: function() {
        var _this = this;
        var c = _this.self.context;
        var nodes = _this._getChildNodes();
        while (c.hasNext()) {
            _this._parseWithFoundNode(c.peek(), nodes);
        }
    },

    _getChildNodes: function(names) {
        var c = this.self.context;
        var childNames = names || this.childNodes;
        return childNames.map(function(nodeStr) {
            var mod = 'Hatena_' + nodeStr.charAt(0).toUpperCase() + nodeStr.substr(1).toLowerCase() + 'Node';
            var n = eval("new "+ mod +"()");
            n._new({ context: c });
            return n;
        });
    },

    _parseWithFoundNode: function(l, nodes) {
        var n = this._findNode(l, nodes);
        n.node.parse(n.match);
    },

    _findNode: function(l, nodes) {
        var c = this.self.context;

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var m;
            if (m = l.match(node.pattern)) {
                return { node: node, match: m };
            }
        }
        
        var node;
        if (l.length == 0) {
            node = new Hatena_BrNode();
        } else if (c.isParagraphSuppressed()) {
            node = new Hatena_CDataNode();
        } else {
            node = new Hatena_PNode();
        }
        node._new({ context: c });
        return { node: node, match: null };
    }
});


Hatena_BlockquoteNode = function(){};
Hatena_BlockquoteNode.prototype = Object.extend(new Hatena_SectionNode(), {
    pattern: /^>(?:(https?:\/\/.*?)(:.*)?)?>$/,
    endPattern: /^<<$/,
    childNodes: ["h4", "h5", "h6", "blockquote", "dl", "list", "pre", "superpre", "table", "gimage", "alias"],

    parse: function(match) {
        var _this = this;
        var c = _this.self.context;
        var cite = null;
        var beginTag = null;
        if (match[1]) {
            var url = match[1];
            var title = String._escapeHTML(match[2] ? match[2].substr(1) : url);
            beginTag = '<blockquote title="' + title + '" cite="' + url + '">';
            cite = '<cite><a href="' + url + '">' + title + '</a></cite>';
        } else {
            beginTag = "<blockquote>";
        }
        c.next();
        var nodes = _this._getChildNodes();
        c.putLine(beginTag);
        c.indent(function() {
            while (c.hasNext()) {
                if (c.peek().match(_this.endPattern)) {
                    c.next();
                    break;
                }
                _this._parseWithFoundNode(c.peek(), nodes);
            }
            if (cite) {
                c.putLine(cite);
            }
        });
        c.putLine("</blockquote>");
    }
});


Hatena_TagNode = function(){};
Hatena_TagNode.prototype = Object.extend(new Hatena_SectionNode(), {
    pattern: /^>(<.*)$/,
    endPattern: /^(.*>)<$/,
    childNodes: ["h4", "h5", "h6", "blockquote", "dl", "list", "pre", "superpre", "table", "gimage", "alias"],

    parse: function(match) {
        var _this = this;
        var c = this.self.context;
        c.next();
        c.suppressParagraph(true);
        var nodes = _this._getChildNodes();
        c.putLine(Hatena_InLine.parsePart(match[1], c));
        while (c.hasNext()) {
            var m2;
            if (m2 = c.peek().match(_this.endPattern)) {
                c.next();
                c.putLine(Hatena_InLine.parsePart(m2[1], c));
                break;
            }
            c.indent(function() {
                _this._parseWithFoundNode(c.peek(), nodes);
            });
        }
        c.suppressParagraph(false);
    }
});


Hatena_TaglineNode = function(){};
Hatena_TaglineNode.prototype = Object.extend(new Hatena_SectionNode(), {
    pattern: /^>(<.*>)<$/,

    parse: function(match) {
        var c = this.self.context;
        c.next();
        c.putLine(Hatena_InLine.parsePart(match[1], c));
    }
});


Hatena_GimageNode = function() {};
Hatena_GimageNode.replaceGimagesInLine = function(text, context) {
    return text.replace(/\[gimage:([\w-]+)(?::([^\]]+))?\]/g, function(matchStr, id, prop) {
        var imageProp = Hatena_GimageNode.getParameters(matchStr, id, prop, context, true);
        return Hatena_GimageNode.getImgTag(imageProp);
    });
};
Hatena_GimageNode.getParameters = function(matchStr, id, prop, context, isInline) {
    var sizes = [];
    var pos = null;
    var alt = "";
    
    prop.split(/,/).forEach(function(p) {
        if (sizes.length < 2 && p.match(/^\d+$/)) {
            sizes.push(+p);
            return;
        }
        if (pos === null && [ "center", "left", "right" ].indexOf(p) !== -1) {
            pos = p;
            return;
        }
        alt = p;
    });

    var size = null;
    var frameSize = null;
    switch (sizes.length) {
    case 0:
        break;
    case 1:
        size = sizes[0];
        frameSize = sizes[0];
        break;
    case 2:
        if (sizes[1] < sizes[0]) {
            size = sizes[1];
            frameSize = sizes[0];
        } else {
            size = sizes[0];
            frameSize = sizes[1];
        }
        break;
    default:
        throw "error";
    }

    var alias = context.getAlias(id);
    var originlUrl = null;
    var url = null;
    if (alias !== null) {
        originlUrl = alias.url;
        url = size ? alias.url.replace(/\/s\d+\//, "/s" + size + "/") : originlUrl;
    }

    return {
        alt: alt,
        size: size,
        frameSize: frameSize,
        pos: pos,
        originalUrl: originlUrl,
        url: url,
        isInline: isInline,
        matchStr: matchStr
    };
};
Hatena_GimageNode.getImgTag = function(args) {
    if (args.url == null) {
        return args.matchStr;
    }
    var beginA = args.isInline ? "" :
        '<div style="text-align: center;"><a href="' + String._escapeHTML(args.originalUrl) + '">';
    var endA = args.isInline ? "" : "</a></div>";

    return beginA + '<img src="' + String._escapeHTML(args.url) + '" alt="' + String._escapeHTML(args.alt) + '" />' + endA;
};
Hatena_GimageNode.prototype = Object.extend(new Hatena_SectionNode(), {
    pattern: /^\[gimage:([\w-]+)(?::([^\]]+))?\]\s*$/,
    childNodes: ["tagline", "tag"],
    denyChildNodes: ["h6", "h5", "h4", "blockquote", "dl", "list", "pre", "superpre", "table", "gimage", "alias"],

    parse: function(match) {
        var _this = this;
        var c = _this.self.context;
        c.next();

        var imageProp = Hatena_GimageNode.getParameters(match[0], match[1], match[2], c, false);
        var imgTag = Hatena_GimageNode.getImgTag(imageProp);

        var getStyle = function() {
            var style = ' style="';
            if (imageProp.pos === "center") {
                style += 'clear: both; margin-left: auto; margin-right: auto; ';
            }
            if (imageProp.pos === "left" || imageProp.pos === "right") {
                style += 'clear: ' + imageProp.pos + "; float: " + imageProp.pos + '; ';
            }
            if (imageProp.frameSize !== null) {
                style += "width: " + imageProp.frameSize + "px;";
            }
            style += '"';
            return style;
        };

        var childNodes = _this._getChildNodes();
        var denyChildNodes = _this._getChildNodes(_this.denyChildNodes);
        

        c.putLine("<figure" + getStyle() + ">");
        c.indent(function() {
            c.putLine(imgTag);
            var hasCaption = false;
            while (c.hasNext()) {
                var n = _this._findNode(c.peek(), childNodes, denyChildNodes);
                if (n == null) {
                    break;
                }
                if (!hasCaption) {
                    c.putLine("<figcaption>");
                    hasCaption = true;
                }
                c.indent(function() {
                    n.node.parse(n.match);
                });
            }
            if (hasCaption) {
                c.putLine("</figcaption>");
            }
        });
        c.putLine("</figure>");
    },

    _findNode: function(line, nodes, denyNodes) {
        var c = this.self.context;

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var m;
            if (m = line.match(node.pattern)) {
                return { node: node, match: m };
            }
        }
        
        for (var i = 0; i < denyNodes.length; i++) {
            var denyNode = denyNodes[i];
            if (line.match(denyNode.pattern)) {
                return null;
            }
        }
        
        if (line.length == 0) {
            return null;
        }

        var node;
        if (c.isParagraphSuppressed()) {
            node = new Hatena_CDataNode();
        } else {
            node = new Hatena_PNode();
        }
        node._new({ context: c });
        return { node: node, match: null };
    }
});
