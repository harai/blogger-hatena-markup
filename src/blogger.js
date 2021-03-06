var bloggerHatenaMarkup = function () {
    var insertTag = function(textarea, sStartTag, sEndTag) {
        var nSelStart = textarea.selectionStart;
        var nSelEnd = textarea.selectionEnd;
        var sOldText = textarea.value;
        textarea.value = sOldText.substring(0, nSelStart) +
            sStartTag + sOldText.substring(nSelStart, nSelEnd) + sEndTag +
            sOldText.substring(nSelEnd);
        textarea.setSelectionRange(nSelStart + sStartTag.length, nSelEnd + sStartTag.length);
        textarea.focus();
    };

    var insertTextUnderCursor = function(textarea, text) {
        var nSelStart = textarea.selectionStart;
        var nSelEnd = textarea.selectionEnd;
        var sOldText = textarea.value;
        textarea.value = sOldText.substring(0, nSelStart) + text + sOldText.substring(nSelEnd);
        var offset = nSelStart + text.length;
        textarea.setSelectionRange(offset, offset);
        textarea.focus();
    };

    var resetTextareaForCatchingInsertion = function(textarea) {
        // the leading "\n" is necessary for matching HTML elements inserted by clicking buttons.
        if (textarea.value.indexOf("\n") != 0) {
            textarea.value = "\n" + textarea.value;
        }
    };

    var getSelection = function(textarea) {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        return textarea.value.substring(start, end);
    };

    // leading space in the textarea value is a prerequisite to call this
    var getTextInsertedByBlogger = function(textarea) {
        var end = textarea.value.indexOf("\n");
        if (end === -1) {
            end = textarea.value.length;
        }
        var text = textarea.value.substring(0, end);
        return text;
    };

    var generateGuid = function() {
        var s4 = function() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    var isShown = function(el) {
        return el.offsetWidth !== 0;
    };
    
    var waitLoop = function(fn) {
        var loop = function() {
            var res = fn();
            if (!res) {
                setTimeout(loop, 100);
            }
        };
        loop();
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
        // :x is used somehow when the dialog reappears after cancelling
        var el = document.getElementById(":w") || document.getElementById(":x");
        return !!el && isShown(el);
    };

    var hatena = new Hatena({ doc: document });
    var textarea = null;
    var emEditor = null;
    var emEditorLoading = null;
    var emEditorCheckbox = null;
    var emPreview = null;
    var emLeftContainer = null;
    
    var stateTemplate = function(args) {
        var name = args.name ? args.name : "anonymous state";
        return function() {
            // console.debug(">>> on " + name);
            if (args.initialize) {
                args.initialize();
            }

            var observer = new MutationObserver(function() {
                // console.debug(">>> on " + name + " mutation found");
                if (args.continueObserving) {
                    if (args.continueObserving()) {
                        return;
                    }
                }

                observer.disconnect();

                if (args.postObserving) {
                    args.postObserving();
                }
                
                if (args.nextState) {
                    var nextState = args.nextState();
                    nextState();
                }
            });
            observer.observe(args.observingNode(), args.observingType);
        };
    };


    var postingHtmlBoxHiddenState = stateTemplate({
        name: "postingHtmlBoxHiddenState",
        observingNode: function() {
            return document.body;
        },
        observingType: { attributes: true, subtree: true },
        continueObserving: function() {
            return !isShown(textarea);
        },
        postObserving: function() {
            var waitLoop = function() {
                if (!textarea.value.match(/^\s*$/)) {
                    textareaToemEditor();
                } else {
                    setTimeout(waitLoop, 100);
                }
            };
            textareaToemEditor();
            waitLoop();
        },
        nextState: function() {
            return postingHtmlBoxShownState;
        }
    });

    var imageDialogShownState = stateTemplate({
        name: "imageDialogShownState",
        observingNode: function() {
            return document.body;
        },
        observingType: { childList: true, attributes: true, subtree: true },
        continueObserving: function() {
            return isImageDialogShown() || isModalDialogShown();
        },
        postObserving: function() {
            if (emEditorToggler.isEnabled()) {
                addImageMarkup();
            }
        },
        nextState: function() {
            return postingHtmlBoxShownState;
        }
    });

    var postingHtmlBoxShownState = stateTemplate({
        name: "postingHtmlBoxShownState",
        observingNode: function() {
            return document.body;
        },
        observingType: { childList: true, attributes: true, subtree: true },
        continueObserving: function() {
            return isShown(textarea) && !isImageDialogShown();
        },
        nextState: function() {
            if (isImageDialogShown()) {
                return imageDialogShownState;
            } else if (!isShown(textarea)) {
                emEditorToggler.disable();
                return postingHtmlBoxHiddenState;
            } else {
                throw "does not happen";
            }
        }
    });

    var addImageMarkup = function() {
        var extractImageData = function() {
            var addedHtml = getTextInsertedByBlogger(textarea);
            if (addedHtml.length === 0) {
                return null;
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
                    var img = a.firstElementChild;
                    var m = img.src.match(/\/s(\d+)\//);
                    if (m !== null) {
                        size = parseInt(m[1]);
                    }
                };
        
                if (el.tagName == "DIV") {
                    pos = "center";
                    inA(el.firstElementChild);
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
        
        var outputToemEditor = function(imageData) {
            var str = imageData.map(function(image) {
                return "[gimage:" + image.id + ":" + image.size +
                    (image.pos !== null ? ("," + image.pos) : "") + "]\n";
            }).join("");
            insertTextUnderCursor(emEditor, str);
            
            var currentPos = emEditor.selectionStart;
            emEditor.setSelectionRange(emEditor.value.length, emEditor.value.length);
            var str2 = imageData.map(function(image) {
                return "\n[alias:" + image.id + ":" + image.url + "]";
            }).join("");
            insertTextUnderCursor(emEditor, str2);
            emEditor.setSelectionRange(currentPos, currentPos);
        };
        
        var imaged = extractImageData();
        if (imaged == null) {
            return;
        }
        outputToemEditor(imaged);
        
        seePreview();
    };

    var loadingStateManager = (function() {
        var timer = null;
        return {
            startLoading: function() {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function() {
                    emEditorLoading.style.display = "none";
                }, 10000);
                emEditorLoading.style.display = "block";
            },
            finishLoading: function() {
                if (timer) {
                    clearTimeout(timer);
                }
                emEditorLoading.style.display = "none";
            },
            isLoading: function() {
                return emEditorLoading.style.display === "block";
            }
        };
    })();

    var emEditorToggler = (function() {
        var enabled = false;

        var changeState = function(enable) {
            enabled = enable;
            textarea.disabled = enable;
            emEditorCheckbox.checked = enable;
            emEditor.disabled = !enable;
            resizer.resize();
            if (enable) {
                emEditorToTextareaSynchronizer.start();
                resetTextareaForCatchingInsertion(textarea);
            } else {
                emEditorToTextareaSynchronizer.stop();
            }
        };

        return {
            init: function() {
                emEditorToTextareaSynchronizer.init();
                emEditorCheckbox.addEventListener("click", function(e) {
                    changeState(!enabled);
                }, false);

                changeState(false);
            },

            enable: function() {
                changeState(true);
            },
            disable: function() {
                changeState(false);
            },
            isEnabled: function() {
                return enabled;
            }
        };
    })();

    var emEditorToTextareaSynchronizer = (function() {
        var timer = null;
        var isOn = false;

        return {
            init: function() {
                emEditor.addEventListener('input', function() {
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

    var resizer = (function() {
        var resizeEvent = function() {
            var container = textarea.parentNode;
            if (container.clientWidth === 0) {
                return;
            }
            textarea.style.height = emEditorToggler.isEnabled() ? "0%" : "90%";
            textarea.style.visibility = emEditorToggler.isEnabled() ? "hidden" : "visible";

            if (container.clientWidth < 900) {
                emPreview.style.cssFloat = "none";
                emPreview.style.width = "100%";
                emLeftContainer.style.cssFloat = "none";
                emLeftContainer.style.width = "100%";

                emLeftContainer.style.height = emEditorToggler.isEnabled() ? "50%" : "10%";
                emPreview.style.height = emEditorToggler.isEnabled() ? "50%" : "0%";
                return;
            }
            if (container.clientWidth < 1400) {
                emPreview.style.width = "60%";
                emPreview.style.cssFloat = "right";
                emLeftContainer.style.width = "40%";
                emLeftContainer.style.cssFloat = "left";
            } else {
                emPreview.style.width = "50%";
                emPreview.style.cssFloat = "right";
                emLeftContainer.style.width = "50%";
                emLeftContainer.style.cssFloat = "left";
            }
            emLeftContainer.style.height = emEditorToggler.isEnabled() ? "100%" : "10%";
            emPreview.style.height = emEditorToggler.isEnabled() ? "100%" : "10%";
        };
        
        return {
            init: function() {
                window.addEventListener("resize", resizeEvent);
                resizeEvent();
            },
            resize: resizeEvent,
        };
    })();

    var mathJax = (function() {
        var bridge = null;
        
        var init = function() {
            var addConfig = function() {
                var script = document.createElement("script");
                script.type = "text/x-mathjax-config";
                script.textContent = "MathJax.Hub.Config({ skipStartupTypeset: true });";
                document.getElementsByTagName("head")[0].appendChild(script);
            };
            
            var addInclude = function() {
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML-full";
                document.getElementsByTagName("head")[0].appendChild(script);
            };

            var createBridge = function() {
                var el = document.createElement("div");
                el.id = "mathjaxBrigde";
                el.style.display = "none";
                document.body.appendChild(el);
                return el;
            };

            var addProcessor = function() {
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.textContent = [
"document.getElementById('mathjaxBrigde').addEventListener('click', function() {",
"    MathJax.Hub.Process(document.getElementById('emPreview'));",
"});"
].join("\n");
                document.body.appendChild(script);
            };

            addConfig();
            addInclude();
            bridge = createBridge();
            addProcessor();
        };

        var process = function() {
            var event = new MouseEvent("click", { "view": window });
            bridge.dispatchEvent(event);
        };

        return {
            init: init,
            process: process
        };
    })();

    var initHatena = function() {  
        var BOX_SIZING = "-moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;";
        var addHatenaElements = function() {
            var createLeftContainer = function() {
                var createemEditor = function() {
                    emEditor = document.createElement("textarea");
                    emEditor.setAttribute("id", "emEditor");
                    emEditor.setAttribute('style', [
                        "width:100%;",
                        "height:100%;",
                        'resize:none;',
                        'display:block;',
                        BOX_SIZING
                    ].join(''));

                    emEditorLoading = document.createElement("div");
                    emEditorLoading.setAttribute("style", [
                        "position: absolute;",
                        "left: 20px;",
                        "top: 20px;",
                        "z-index: 10;",
                        "display: none;",
                        "font-weight: bold;",
                        "font-size: 20px;",
                        "background-color: cyan;",
                        "padding: 10px;",
                        "padding: 10px;",
                    ].join(''));
                    emEditorLoading.appendChild(document.createTextNode("Fetching the title..."));

                    var emEditorDiv = document.createElement("div");
                    emEditorDiv.setAttribute('style', [
                        "top:30px;",
                        "bottom:0;",
                        "position:absolute;",
                        "width:100%;",
                        BOX_SIZING
                    ].join(''));
                    emEditorDiv.appendChild(emEditor);
                    emEditorDiv.appendChild(emEditorLoading);

                    return emEditorDiv;
                };

                var createCheckbox = function() {
                    var createUsage = function() {
                        var a = document.createElement("a");
                        a.href = "http://extreme-markup.blogspot.jp/p/syntax-and-features.html";
                        a.target = "_blank";
                        a.textContent = "[Usage]";
                        a.style = "margin-left: 10px";
                        return a;
                    };

                    emEditorCheckbox = document.createElement("input");
                    emEditorCheckbox.setAttribute("type", "checkbox");
                    emEditorCheckbox.setAttribute("id", "emEditorCheckbox");

                    var label = document.createElement("label");
                    label.setAttribute("for", "emEditorCheckbox");
                    label.appendChild(document.createTextNode("Use Extreme Markup"));

                    var checkboxDiv = document.createElement("div");
                    checkboxDiv.setAttribute('style', [
                        "height:30px;",
                        'padding:5px;'
                    ].join(''));
                    checkboxDiv.appendChild(emEditorCheckbox);
                    checkboxDiv.appendChild(label);
                    checkboxDiv.appendChild(createUsage());

                    return checkboxDiv;
                };

                emLeftContainer = document.createElement("div");
                emLeftContainer.setAttribute('style', [
                    'position:relative;',
                    'display:block;',
                    BOX_SIZING
                ].join(''));
                emLeftContainer.appendChild(createCheckbox());
                emLeftContainer.appendChild(createemEditor());

                return emLeftContainer;
            };

            var createemPreview = function() {
                emPreview = document.createElement("div");
                emPreview.setAttribute('id', "emPreview");
                emPreview.setAttribute('style', [
                    'border:solid black 1px;',
                    'padding:5px;',
                    "overflow:scroll;",
                    BOX_SIZING
                ].join(''));

                return emPreview;
            };

            var box = textarea.parentElement;
            box.appendChild(createLeftContainer());
            box.appendChild(createemPreview());
        };

        var addPreviewStyles = function() {
            var style = document.createElement("style");
            style.textContent = [
                ,"#postingHtmlBox {"
                    ,BOX_SIZING
                ,"}"
// based on http://www.w3.org/TR/CSS21/sample.html
,"#emPreview address,#emPreview blockquote,#emPreview body,#emPreview dd,#emPreview div,#emPreview dl,#emPreview dt,#emPreview fieldset,#emPreview form,#emPreview frame,#emPreview frameset,#emPreview h1,#emPreview h2,#emPreview h3,#emPreview h4,#emPreview h5,#emPreview h6,#emPreview noframes,#emPreview ol,#emPreview p,#emPreview ul,#emPreview center,#emPreview dir,#emPreview hr,#emPreview menu,#emPreview pre{display:block;unicode-bidi:embed;}"
,"#emPreview li{display:list-item;}"
,"#emPreview head{display:none;}"
,"#emPreview table{display:table;}"
,"#emPreview tr{display:table-row;}"
,"#emPreview thead{display:table-header-group;}"
,"#emPreview tbody{display:table-row-group;}"
,"#emPreview tfoot{display:table-footer-group;}"
,"#emPreview col{display:table-column;}"
,"#emPreview colgroup{display:table-column-group;}"
,"#emPreview td,#emPreview th{display:table-cell;}"
,"#emPreview caption{display:table-caption;}"
,"#emPreview th{font-weight:bolder;text-align:center;}"
,"#emPreview caption{text-align:center;}"
,"#emPreview body{margin:8px;}"
,"#emPreview h1,#emPreview h2,#emPreview h3,#emPreview h4{font-size:2em;margin:0.67em 0;}"
,"#emPreview h5{font-size:1.5em;margin:0.75em 0;}"
,"#emPreview h6{font-size:1.17em;margin:0.83em 0;}"
,"#emPreview p,#emPreview blockquote,#emPreview ul,#emPreview fieldset,#emPreview form,#emPreview ol,#emPreview dl,#emPreview dir,#emPreview menu{margin:1.12em 0;}"
,"#emPreview h1,#emPreview h2,#emPreview h3,#emPreview h4,#emPreview h5,#emPreview h6,#emPreview b,#emPreview strong{font-weight:bolder;}"
,"#emPreview blockquote{margin-left:40px;margin-right:40px;}"
,"#emPreview i,#emPreview cite,#emPreview em,#emPreview var,#emPreview address{font-style:italic;}"
,"#emPreview pre,#emPreview tt,#emPreview code,#emPreview kbd,#emPreview samp{font-family:monospace;}"
,"#emPreview pre{white-space:pre;}"
,"#emPreview button,#emPreview textarea,#emPreview input,#emPreview select{display:inline-block;}"
,"#emPreview big{font-size:1.17em;}"
,"#emPreview small,#emPreview sub,#emPreview sup{font-size:0.83em;}"
,"#emPreview sub{vertical-align:sub;}"
,"#emPreview sup{vertical-align:super;}"
,"#emPreview table{border-spacing:2px;}"
,"#emPreview thead,#emPreview tbody,#emPreview tfoot{vertical-align:middle;}"
,"#emPreview td,#emPreview th,#emPreview tr{vertical-align:inherit;}"
,"#emPreview s,#emPreview strike,#emPreview del{text-decoration:line-through;}"
,"#emPreview hr{border:1px inset;}"
,"#emPreview ol,#emPreview ul,#emPreview dir,#emPreview menu,#emPreview dd{margin-left:40px;}"
,"#emPreview ol{list-style-type:decimal;}"
,"#emPreview ol ul,#emPreview ul ol,#emPreview ul ul,#emPreview ol ol{margin-top:0;margin-bottom:0;}"
,"#emPreview u,#emPreview ins{text-decoration:underline;}"
,"#emPreview br:before{content:\"\A\";white-space:pre-line;}"
,"#emPreview center{text-align:center;}"
,"#emPreview :link,#emPreview :visited{text-decoration:underline;}"
,"#emPreview :focus{outline:thin dotted invert;}"
// original style
,"#emPreview figure{display:block;margin-top:1em;margin-bottom:1em;margin-left:40px;margin-right:40px;}"
,"#emPreview div.previewOnly{margin:10px;font-size:13px;font-weight:bold;color:#888;}"
,"#emPreview h4,#emPreview h5,#emPreview h6{clear:both;}"
,'#emPreview figure.emebLeft{clear:left;float:left;}'
,'#emPreview figure.emebRight{clear:right;float:right;}'
,'#emPreview figure.emebCenter{clear:both;margin-left:auto;margin-right:auto;}'
,'#emPreview figure>div.emebImage{text-align:center;}'
,"#emPreview ol ul,#emPreview ul,#emPreview ul ul{list-style-type: disc;}"
,"#emPreview ol,#emPreview ul ol,#emPreview ol ol{list-style-type: decimal;}"
,"#emPreview dt{font-weight:bold;}"
,"#emPreview table,#emPreview th,#emPreview td{border:1px solid black;border-collapse:collapse;}"
,"#emPreview th,#emPreview td{padding:5px;}"
,"#emPreview pre,#emPreview table{margin:15px;}"
            ].join('\n');
            document.head.appendChild(style);
        };
        
        var setLinkAction = function() {
            (function() {
                var hlc = document.createElement("div");
                hlc.id = "hatenaLinkContainer";
                hlc.style.display = "none";
                hlc.addEventListener("click", function() {
                     // discard the delayed response to avoid unintended insertion
                    if (!loadingStateManager.isLoading()) {
                        return;
                    }
                    loadingStateManager.finishLoading();
                    var url = hlc.getAttribute("data-url");
                    var title = hlc.getAttribute("data-title");
                    showLink(url, String._escapeHTML(title));
                });
                document.body.appendChild(hlc);
    
                var script = document.createElement("script");
                script.setAttribute("type", "application/javascript");
                script.textContent = [
                    "function bloggerHatenaMarkup_linkCallback(j) {",
                        "var hlc = document.getElementById('hatenaLinkContainer');",
                        "hlc.setAttribute('data-url', j.targetUrl);",
                        "hlc.setAttribute('data-title', j.pageTitle);",
                        "var event = new MouseEvent('click', { 'view': window });",
                        "hlc.dispatchEvent(event);",
                    "}",
                ].join("\n");
                document.body.appendChild(script);

                return hlc;
            })();

            var showLink = function(url, innerText) {
                var text = "[" + String._escapeUrlInsideBracket(url) + ":" +
                    String._escapeInsideLink(innerText) + "]";
                insertTextUnderCursor(emEditor, text);
                
                seePreview();
            };
            
            var generateLinkAuto = function(url) {
                var reqUrl = "http://www.pagesynopsis.com/pageinfo?callback=bloggerHatenaMarkup_linkCallback&" +
                    "targetUrl=" + encodeURI(url);
                var jsonp = document.createElement("script");
                jsonp.setAttribute("type", "application/javascript");
                jsonp.setAttribute("src", reqUrl);
                document.body.appendChild(jsonp);
                // bloggerHatenaMarkup_linkCallback will be called later
                loadingStateManager.startLoading();
            };

            var getLink = function() {
                var inserted = getTextInsertedByBlogger(textarea);
                if (inserted === "") {
                    return;
                }

                var c = document.createElement("div");
                c.innerHTML = inserted;
                var href = c.firstElementChild.href;

                var innerText = getSelection(emEditor);

                if (innerText === "") {
                    generateLinkAuto(href);
                    seePreview(); // to remove the input text on textarea
                    return;
                }

                showLink(href, innerText);
            };
            
            waitLoop(function() {
                var link = null;
                if (link = document.getElementById("link")) {
                    link.addEventListener("click", function() {
                        if (emEditorToggler.isEnabled()) {
                            getLink();
                        }
                    });
                    return true;
                }
                return false;
            });
        };

        var setDecoratorTagsAction = function() {
            var tags = [
                { id: "bold", sTag: "<strong>", eTag: "</strong>" },
                { id: "italic", sTag: "<i>", eTag: "</i>" },
                { id: "strikeThrough", sTag: "<strike>", eTag: "</strike>" },
                { id: "BLOCKQUOTE", sTag: "\n>>\n", eTag: "\n<<\n" }
            ];

            tags.forEach(function(tag) {
                waitLoop(function() {
                    var el = null;
                    if (el = document.getElementById(tag.id)) {
                        el.addEventListener("click", function() {
                            if (emEditorToggler.isEnabled()) {
                                insertTag(emEditor, tag.sTag, tag.eTag);
                                seePreview();
                            }
                        });
                        return true;
                    }
                    return false;
                });
            });
        };

        mathJax.init();
        addPreviewStyles();
        addHatenaElements();
        emEditorToggler.init();
        setLinkAction();
        setDecoratorTagsAction();
        resizer.init();
    };

    var initState = stateTemplate({
        name: "initState",
        observingNode: function() {
            return document.body;
        },
        observingType: { childList: true, subtree: true },
        continueObserving: function() {
            return !(textarea = document.getElementById("postingHtmlBox"));
        },
        postObserving: function() {
            initHatena();
        },
        nextState: function() {
            return postingHtmlBoxHiddenState;
        }
    });
    
    var extractHatenaOrNull = function(str) {
        var m = str.match(/\n<!--ExtremeMarkup\r?\n([\s\S]*)\nExtremeMarkup-->/);
        if (m === null) {
            return null;
        }
        return m[1].replace(/\{\{(\d+) hyphens\}\}/g, function($0,$1) { return String.times('-', +$1); });
    };
    
    var textareaToemEditor = function() {
        var h = extractHatenaOrNull(textarea.value);
        if (h === null) {
            emEditor.value = "";
            emPreview.innerHTML = "";
            emEditorToggler.disable();
        } else {
            emEditor.value = h;
            seePreview();
            emEditorToggler.enable();
        }
    };
    
    initState();

    function seePreview() {
        var htmlPost = hatena.parse(emEditor.value);
        emPreview.innerHTML = htmlPost;
        setTextArea(htmlPost);
        mathJax.process();
    }

    var styles = (function() {
        var styles = [
,'<style type="text/css" scoped="scoped">'
,'h4.emeb,h5.emeb,h6.emeb{clear:both;}'
,'figure.emebLeft{clear:left;float:left;}'
,'figure.emebRight{clear:right;float:right;}'
,'figure.emebCenter{clear:both;margin-left:auto;margin-right:auto;}'
,'figure>div.emebImage{text-align:center;}'
,'</style>'
        ].join("\n") + "\n";

        return styles;
    })();

    function setTextArea(htmlPost) {
        var html = htmlPost.replace(/<!--emPreview-->.*?<!--\/emPreview-->/mg, "");
        textarea.value = styles + html + "\n<!--ExtremeMarkup\n" + emEditor.value.replace(
            /-{2,}/g, function($0) { return '{{'+$0.length+' hyphens}}'; }
            ) + "\nExtremeMarkup-->";
        resetTextareaForCatchingInsertion(textarea);
    }
};

bloggerHatenaMarkup();
