var critical = (function (exports) {
    'use strict';

    function matchesSelector(el, selector) {

        let matchesSelector = el.matchesSelector || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;

        if (matchesSelector) {
            try {
                return matchesSelector.call(el, selector);
            } catch (e) {
                return false;
            }
        } else {
            let matches = el.ownerDocument.querySelectorAll(selector),
                len = matches.length;

            while (len && len--) {
                if (matches[len] === el) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * resolve to absolute for external urls, relative for same domain
     * @param {string} path
     * @param {string} from
     * @returns {string}
     */
    function resolve(path, from) {

        if (path.match(/^['"]?data:/)) {

            return path;
        }

        const baseURL = new URL(from, window.location);
        const pathURL = new URL(path, baseURL);

        if (baseURL.protocol != pathURL.protocol ||
            baseURL.host != pathURL.host ||
            pathURL.host != window.location.host ||
            baseURL.port != pathURL.port ||
            pathURL.port != window.location.port ||
            baseURL.port != pathURL.port ||
            pathURL.protocol != window.location.protocol
        ) {

            return pathURL.toString();
        }

        return pathURL.pathname + pathURL.search + pathURL.hash;
    }

    /**
     * {Object} options
     * - fonts: generate javascript font loading script
     * @returns {Promise<{styles: string[], fonts: object[], stats: object}>}
     */
    async function extract(options = {}) {

        options = Object.assign({
            // not implemented... yet
            // inlineFonts: false,
            fonts: true
        }, options);

        const styles = new Set;
        const excluded = ['all', 'print', ''];
        const allStylesheets = [];

        // Get a list of all the elements in the view.
        const height = window.innerHeight;
        const walker = document.createNodeIterator(document, NodeFilter.SHOW_ELEMENT, {acceptNode: function (node) {
            return NodeFilter.SHOW_ELEMENT;
        }});

        const fonts = new Set;
        const fontFamilies = new Set;
        const files = new Map;
        let nodeCount = 0;
        let k;
        let rule;
        let rules;

        performance.mark('filterStylesheets');

        for (k = 0; k < document.styleSheets.length; k++) {

            rule = document.styleSheets[k];

            if (rule.media.mediaText == 'print' || (rule.media.mediaText !== '' && !window.matchMedia(rule.media.mediaText).matches)) {

                continue;
            }

            try {

                rules = rule.cssRules || rule.rules;

                for (let l = 0; l < rules.length; l++) {

                    allStylesheets.push({rule: rules[l], match: false});
                }

            } catch (e) {

                console.error(JSON.stringify({'message': e.message, stylesheet: rule.href}, null, 1));
            }
        }

        performance.measure('filter stylesheets', 'filterStylesheets');

        if (allStylesheets.length === 0) {

            return [];
        }

        let node;
        let allStylesLength = allStylesheets.length;

        performance.mark('nodeWalking');

        while ((node = walker.nextNode())) {

            if (['SCRIPT', 'LINK', 'HEAD', 'META', 'TITLE', 'NOSCRIPT'].includes(node.tagName)) {

                continue;
            }

            nodeCount++;
            let rect = node.getBoundingClientRect();

            if (rect.top < height) {

                for (k = 0; k < allStylesLength; k++) {

                    if (allStylesheets[k].match) {

                        continue;
                    }

                    if (allStylesheets[k].rule instanceof CSSStyleRule) {

                        if (matchesSelector(node, allStylesheets[k].rule.selectorText)) {

                            allStylesheets[k].match = true;

                            if (allStylesheets[k].rule.style.getPropertyValue('font-family')) {

                                allStylesheets[k].rule.style.getPropertyValue('font-family').split(/\s*,\s*/).forEach(fontFamily => fontFamily != 'inherit' && fontFamilies.add(fontFamily.replace(/(['"])([^\1\s]+)\1/, '$2')));
                            }
                        }

                    } else if (allStylesheets[k].rule instanceof CSSMediaRule || allStylesheets[k].rule instanceof CSSImportRule) {

                        if (allStylesheets[k].rule.media.mediaText !== '' && !window.matchMedia(allStylesheets[k].rule.media.mediaText).matches) {
                            continue;
                        }

                        const rules = [];
                        const sheet = allStylesheets[k].rule.cssRules || allStylesheets[k].rule.rules;
                        let l;

                        for (l = 0; l < sheet.length; l++) {

                            rules.push({rule:  sheet[l], match: false});
                        }

                        rules.unshift(k + 1, 0);
                        allStylesheets.splice.apply(allStylesheets, rules);
                        allStylesLength = allStylesheets.length;

                        if (allStylesheets[k].rule instanceof CSSImportRule) {

                            styles.add('/* @import: ' + allStylesheets[k].rule.href + ' from ' + (allStylesheets[k].rule.parentStyleSheet.href || `inline #${inlineCount}`) + ' */');
                        }

                    }
                    else if (allStylesheets[k].rule instanceof CSSFontFaceRule) {

                        if (allStylesheets[k].rule.style.getPropertyValue('font-family') && allStylesheets[k].rule.style.getPropertyValue('src')) {

                            fonts.add(allStylesheets[k].rule);
                        }
                    }
                }
            }
        }

        performance.measure('node walking', 'nodeWalking');

        let css;
        let file = '';
        let inlineCount = -1;


        performance.mark('rulesExtraction');

        loop1:
            for (let k = 0; k < allStylesLength; k++) {

                if (!allStylesheets[k].match) {

                    continue;
                }

                rule = allStylesheets[k].rule;
                let fileUpdate = false;

                if (!files.has(rule.parentStyleSheet)) {

                    //
                    files.set(rule.parentStyleSheet, {

                        base: (rule.parentStyleSheet.href && rule.parentStyleSheet.href.replace(/[?#].*/, '') || location.pathname).replace(/([^/]+)$/, ''),
                        file: rule.parentStyleSheet.href || `inline #${++inlineCount}`
                    });

                    fileUpdate = true;
                } else if (file && file != files.get(rule.parentStyleSheet).file) {

                    fileUpdate = true;
                }

                if (fileUpdate) {

                    try {

                        console.log('analysing ' + files.get(rule.parentStyleSheet).file);
                        styles.add('/* file: ' + files.get(rule.parentStyleSheet).file + ' */');
                    } catch (e) {

                        console.error(e.message);
                        console.error(rule.parentStyleSheet);
                    }
                }

                file = files.get(rule.parentStyleSheet).file;
                css = rule.cssText;

                if (file != 'inline') {

                    // resolve url()
                    css = css.replace(/url\(([^)%\s]*?)\)/g, function (all, one) {

                        one = one.trim();

                        if (one.match(/^['"]?data:/)) {

                            return all;
                        }

                        one = one.replace(/^(['"])([^\1\s]+)\1/, '$2');

                        return 'url(' + resolve(one, files.get(rule.parentStyleSheet).base) + ')';
                    });
                }

                while (rule.parentRule) {

                        /**
                         *
                         * @type {CSSMediaRule}
                         */
                        rule = rule.parentRule;

                        if (rule.conditionText == 'print') {

                            continue loop1;
                        }

                        if (!excluded.includes(rule.conditionText)) {

                            css = '@media ' + rule.conditionText + ' {' + css + '}';
                        }

                        if (!rule.parentRule) {

                            break;
                        }
                    }

                if (rule.parentStyleSheet) {

                    let media = rule.parentStyleSheet.media.mediaText;

                    if (media == 'print') {

                        continue loop1;
                    }

                    if (!excluded.includes(media)) {

                        css = '@media ' + media + ' {' + css + '}';
                    }
                }

                if (styles.has(css)) {

                    styles.delete(css);
                }

                styles.add(css);
            }

        performance.measure('rules extraction', 'rulesExtraction');

        const usedFonts = new Map;

        if (options.fonts) {

            let j;
            let name;
            let value;
            let font;
            let fontObject;

            performance.mark('fontsExtraction');

            for (font of fonts) {

                if (font.style.getPropertyValue('font-family').split(/\s*,\s*/).some(token => {

                    return fontFamilies.has(token.replace(/(['"])([^\1\s]+)\1/, '$2'));
                })) {

                    fontObject = {
                        'fontFamily': font.style.getPropertyValue('font-family').replace(/(['"])([^\1\s]+)\1/, '$2'),
                        src: font.style.getPropertyValue('src').replace(/(^|[,\s*])local\([^)]+\)\s*,?\s*?/g, '').replace(/url\(([^)%\s]+)\)([^,]*)(,?)\s*/g, (all, one, two, three) => {

                            one = one.replace(/(['"])([^\1\s]+)\1/, '$2');

                            if (!files.has(font.parentStyleSheet)) {

                                files.set(font.parentStyleSheet, {

                                    base: font.parentStyleSheet.href.replace(/([^/]+)$/, ''),
                                    file: font.parentStyleSheet.href
                                });
                            }

                            return 'url(' + resolve(one, files.get(font.parentStyleSheet).base) + ')' + three;
                        }).trim(),
                        properties: {}
                    };

                    j = font.style.length;

                    while (j--) {

                        name = font.style.item(j);
                        value = font.style.getPropertyValue(name);

                        name != 'font-family' &&
                        name != 'src' &&
                        value !== '' &&
                        value !== undefined &&
                        (fontObject.properties[name.replace(/([A-Z])/g, (all, name) => '-' + name.toLowerCase())] = value);
                    }

                    usedFonts.set(JSON.stringify(fontObject), fontObject);
                }
            }

            performance.measure('fonts extraction', 'fontsExtraction');
        }

        const stats = performance.getEntriesByType("measure").filter(entry => ['filter stylesheets', 'node walking', 'rules extraction', 'fonts extraction'].includes(entry.name)).map(entry => {

            return {

                name: entry.name,

                duration: (entry.duration / 1000).toFixed(3) + 's'
            }
        });

        return {styles: [...styles], fonts: [...usedFonts.values()], nodeCount, stats: {nodeCount, stats}};
    }

    /**
     *
     * @param {string[]} content
     * @param {string} filename
     * @param {string} mimetype
     * @return {Promise<string[]>}
     */
    async function download(content, filename, mimetype = 'application/octet-stream; charset=utf-8') {

        //
        const url = URL.createObjectURL(new Blob(content, {type: mimetype}));
        //
        const a = document.createElement('a');
        document.body.append(a);
        a.style.display = 'none';
        a.download = filename;
        a.href = url;

        //
        a.dispatchEvent(new MouseEvent('click'));
        URL.revokeObjectURL(url);

        return content;
    }

    /**
     *
     * @param {string[]} fonts
     */
    function fontscript(fonts) {

        return '/* font preloader script: ' + fonts.length + ' */\n"fonts" in document && ' + JSON.stringify([...fonts], null, 1) + '.forEach(font => new FontFace(font.fontFamily, font.src, font.properties).load().then(font => document.fonts.add(font)))'
    }

    /**
     *
     * @param {string} filename
     * @return {Promise<{styles: string[], fonts: object[]}>}
     */
    async function extractAndDownload(filename = 'critical.css', options = {}) {

        return extract(options).then(async content => {
            await download(content.styles, filename, 'text/css; charset=utf-8').then(async () => {

                if (content.fonts.length > 0) {

                    await download([fontscript(content.fonts)], filename.replace(/\.css$/, '.js'), 'text/javascript; charset=utf-8');
                }
            });

            return content
        });
    }

    exports.download = extractAndDownload;
    exports.extract = extract;
    exports.fontscript = fontscript;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
