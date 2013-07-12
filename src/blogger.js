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

    var hatena = new Hatena({ doc: document });
    var textarea = null;
    var hatenaEditor = null;
    var hatenaEditorCheckbox = null;
    var hatenaPreview = null;
    var hatenaLeftContainer = null;
    
    var stateTemplate = function(args) {
        var name = args.name ? args.name : "anonymous state"
        return function() {
            console.debug(">>> on " + name);
            if (args.initialize) {
                args.initialize();
            }

            var observer = new MutationObserver(function() {
                console.debug(">>> on " + name + " mutation found");
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
                    setTimeout(textareaToHatenaEditor, 50);
                } else {
                    setTimeout(waitLoop, 100);
                }
            };
            waitLoop();
        },
        nextState: function() {
            return postingHtmlBoxShownState;
        }
    });

    var imageDialogShownState = stateTemplate({
        name: "imageDialogShownState",
        initialize: function() {
            if (hatenaEditorToggler.isEnabled()) {
                textarea.setSelectionRange(0, 0);
            }
        },
        observingNode: function() {
            return document.body;
        },
        observingType: { childList: true, attributes: true, subtree: true },
        continueObserving: function() {
            return isImageDialogShown() || isModalDialogShown();
        },
        postObserving: function() {
            if (hatenaEditorToggler.isEnabled()) {
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
                hatenaEditorToggler.disable();
                return postingHtmlBoxHiddenState;
            } else {
                throw "does not happen";
            }
        }
    });

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
            if (isShown(textarea)) { // TODO remove because useless
                return postingHtmlBoxShownState;
            }
            return postingHtmlBoxHiddenState;
        }
    });
    
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
