(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.critical = {}));
})(this, (function (exports) { 'use strict';

    function resolve(path, from) {
        if (path.match(/^['"]?data:/)) {
            return path;
        }
        // @ts-ignore
        const baseURL = new URL(from, window.location);
        const pathURL = new URL(path, baseURL);
        if (baseURL.protocol != pathURL.protocol ||
            baseURL.host != pathURL.host ||
            pathURL.host != window.location.host ||
            baseURL.port != pathURL.port ||
            pathURL.port != window.location.port ||
            baseURL.port != pathURL.port ||
            pathURL.protocol != window.location.protocol) {
            return pathURL.toString();
        }
        return pathURL.pathname + pathURL.search + pathURL.hash;
    }

    function fontscript(fonts) {
        return '/* font preloader script: ' + fonts.length + ' */\n"fonts" in document && ' + JSON.stringify([...fonts], null, 1) + '.forEach(font => new FontFace(font.fontFamily, font.src, font.properties).load().then(font => document.fonts.add(font)))';
    }

    function abortSignal() {
        throw new Error(`CSS extraction aborted`);
    }
    /**
     * {Object} options
     * - signal {AbortSignal?} abort css extraction
     * - html {bool?} generate HTML for each viewport
     * - fonts {bool?} generate javascript to download fonts
     *
     * @returns {Promise<{styles: string[], fonts: object[], stats: object, html: string?}>}
     */
    async function extract(options) {
        const document = window.document;
        const location = window.location;
        const styles = new Set;
        const excluded = ['all', 'print', ''];
        const allStylesheets = new Array();
        const height = window.innerHeight;
        const walker = document.createNodeIterator(document, NodeFilter.SHOW_ELEMENT, { acceptNode: () => NodeFilter.SHOW_ELEMENT });
        const fonts = new Set();
        const fontFamilies = new Set;
        const files = new Map;
        const weakMap = new WeakMap;
        const nodeMap = new WeakMap;
        let nodeCount = 0;
        let k;
        let rule;
        let rules;
        options.signal?.addEventListener('abort', abortSignal);
        performance.mark('filterStylesheets');
        for (k = 0; k < document.styleSheets.length; k++) {
            rule = document.styleSheets[k];
            if (rule.media.mediaText === 'print' || (rule.media.mediaText !== '' && !window.matchMedia(rule.media.mediaText).matches)) {
                continue;
            }
            try {
                rules = rule.cssRules || rule.rules;
                for (let l = 0; l < rules.length; l++) {
                    allStylesheets.push({ rule: rules[l], match: false });
                }
            }
            catch (e) {
                console.error(JSON.stringify({ 'message': e.message + '\n' + e.stack, stylesheet: rule.href }, null, 1));
            }
        }
        performance.measure('filter stylesheets', 'filterStylesheets');
        if (allStylesheets.length === 0) {
            // @ts-ignore
            return { styles: [], fonts: [], stats: {} };
        }
        let node;
        let rect;
        let allStylesLength = allStylesheets.length;
        performance.mark('nodeWalking');
        // @ts-ignore
        while ((node = walker.nextNode())) {
            if (options && options.signal && options.signal.aborted) {
                return Promise.reject('Aborted');
            }
            if (['SCRIPT', 'LINK', 'HEAD', 'META', 'TITLE', 'NOSCRIPT'].includes(node.tagName)) {
                continue;
            }
            nodeCount++;
            // @ts-ignore
            rect = node.getBoundingClientRect();
            if (rect.top < height) {
                nodeMap.set(node, 1);
            }
        }
        for (k = 0; k < allStylesLength; k++) {
            if (allStylesheets[k].match || weakMap.has(allStylesheets[k].rule)) {
                continue;
            }
            weakMap.set(allStylesheets[k].rule, 1);
            if (allStylesheets[k].rule instanceof CSSStyleRule) {
                // @ts-ignore
                let selector = allStylesheets[k].rule.selectorText;
                let match;
                // detect pseudo selectors
                if (selector.match(/(^|,|\s)::?((before)|(after))/)) {
                    match = true;
                }
                else {
                    if (selector.match(/::?((before)|(after))/)) {
                        selector = selector.replace(/::?((before)|(after))\s*((,)|$)/g, '$5');
                    }
                    try {
                        match = nodeMap.has(document.querySelector(selector));
                    }
                    catch (e) {
                        // @ts-ignore
                        match = nodeMap.has(document.querySelector(allStylesheets[k].rule.selectorText));
                    }
                }
                if (match) {
                    allStylesheets[k].match = true;
                    // @ts-ignore
                    if (allStylesheets[k].rule.style.getPropertyValue('font-family')) {
                        // @ts-ignore
                        allStylesheets[k].rule.style.getPropertyValue('font-family').split(/\s*,\s*/).forEach(fontFamily => fontFamily !== 'inherit' && fontFamilies.add(fontFamily.replace(/(['"])([^\1\s]+)\1/, '$2')));
                    }
                }
            }
            else if (allStylesheets[k].rule instanceof CSSMediaRule || allStylesheets[k].rule instanceof CSSImportRule || allStylesheets[k].rule instanceof CSSConditionRule) {
                // @ts-ignore
                if ((allStylesheets[k].rule instanceof CSSMediaRule || allStylesheets[k].rule instanceof CSSImportRule) && (allStylesheets[k].rule.media.mediaText === 'print' || (allStylesheets[k].rule.media.mediaText !== '' && !window.matchMedia(allStylesheets[k].rule.media.mediaText).matches))) {
                    continue;
                }
                try {
                    const rule = allStylesheets[k].rule;
                    const rules = [];
                    // @ts-ignore
                    const sheet = rule instanceof CSSImportRule ? rule.styleSheet.cssRules || rule.styleSheet.rules : rule.cssRules || rule.rules;
                    for (let l = 0; l < sheet.length; l++) {
                        if (!weakMap.has(sheet[l])) {
                            // @ts-ignore
                            rules.push({ rule: sheet[l], match: false });
                        }
                    }
                    if (rules.length > 0) {
                        // @ts-ignore
                        allStylesheets.splice.apply(allStylesheets, [k + 1, 0].concat(rules));
                        allStylesLength = allStylesheets.length;
                    }
                }
                catch (e) {
                    // @ts-ignore
                    console.error(JSON.stringify({ 'message': e.message + '\n' + e.stack, stylesheet: rule.href }, null, 1));
                }
            }
            else if (allStylesheets[k].rule instanceof CSSFontFaceRule) {
                // @ts-ignore
                if (allStylesheets[k].rule.style.getPropertyValue('font-family') && allStylesheets[k].rule.style.getPropertyValue('src')) {
                    // @ts-ignore
                    fonts.add(allStylesheets[k].rule);
                }
            }
        }
        performance.measure('node walking', 'nodeWalking');
        let css;
        let file = '';
        let inlineCount = -1;
        performance.mark('rulesExtraction');
        loop1: for (let k = 0; k < allStylesLength; k++) {
            if (!allStylesheets[k].match) {
                continue;
            }
            rule = allStylesheets[k].rule;
            let fileUpdate = false;
            if (!files.has(rule.parentStyleSheet)) {
                //
                files.set(rule.parentStyleSheet, {
                    // @ts-ignore
                    base: (rule.parentStyleSheet.href && rule.parentStyleSheet.href.replace(/[?#].*/, '') || location.pathname).replace(/([^/]+)$/, ''),
                    // @ts-ignore
                    file: rule.parentStyleSheet.href || `inline style #${++inlineCount}`
                });
                fileUpdate = true;
            }
            else { // @ts-ignore
                if (file && file !== files.get(rule.parentStyleSheet).file) {
                    fileUpdate = true;
                }
            }
            if (fileUpdate) {
                // @ts-ignore
                try {
                    console.log('analysing ' + files.get(rule.parentStyleSheet).file);
                    styles.add('/* file: ' + files.get(rule.parentStyleSheet).file + ' */');
                }
                catch (e) {
                    console.error(JSON.stringify(e.message + '\n' + e.stack, null, 1));
                    console.error(JSON.stringify(rule?.parentStyleSheet?.href, null, 1));
                }
            }
            file = files.get(rule.parentStyleSheet).file;
            // @ts-ignore
            css = rule.cssText;
            if (file !== 'inline') {
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
            // @ts-ignore
            while (rule.parentRule) {
                /**
                 *
                 * @type {CSSMediaRule}
                 */
                // @ts-ignore
                rule = rule.parentRule;
                // @ts-ignore
                if (rule.conditionText == 'print') {
                    continue loop1;
                }
                // @ts-ignore
                if (!excluded.includes(rule.conditionText)) {
                    // @ts-ignore
                    css = '@' + rule.constructor.name.replace(/^CSS(.*?)Rule/, '$1').toLowerCase() + ' ' + rule.conditionText + ' {' + css + '}';
                }
                // @ts-ignore
                if (!rule.parentRule) {
                    break;
                }
            }
            if (rule.parentStyleSheet) {
                let media = rule.parentStyleSheet.media.mediaText;
                if (media === 'print') {
                    continue;
                }
                if (media !== '') {
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
        // @ts-ignore
        if (options.fonts) {
            let j;
            let name;
            let value;
            let font;
            let fontObject;
            let src;
            performance.mark('fontsExtraction');
            for (font of fonts) {
                // @ts-ignore
                if (font.style.getPropertyValue('font-family').split(/\s*,\s*/).some(token => {
                    return fontFamilies.has(token.replace(/(['"])([^\1\s]+)\1/, '$2'));
                })) {
                    // @ts-ignore
                    src = font.style.getPropertyValue('src');
                    if (!src) {
                        continue;
                    }
                    fontObject = {
                        // @ts-ignore
                        'fontFamily': font.style.getPropertyValue('font-family').replace(/(['"])([^\1\s]+)\1/, '$2'),
                        src: src.replace(/(^|[,\s*])local\([^)]+\)\s*,?\s*?/g, '').replace(/url\(([^)%\s]+)\)([^,]*)(,?)\s*/g, (all, one, two, three) => {
                            one = one.replace(/(['"])([^\1\s]+)\1/, '$2');
                            if (!files.has(font.parentStyleSheet)) {
                                if (!font.parentStyleSheet.href) {
                                    return all;
                                }
                                files.set(font.parentStyleSheet, {
                                    // @ts-ignore
                                    base: font.parentStyleSheet.href.replace(/([^/]+)$/, ''),
                                    // @ts-ignore
                                    file: font.parentStyleSheet.href
                                });
                            }
                            return 'url(' + resolve(one, files.get(font.parentStyleSheet).base) + ')' + three;
                        }).trim(),
                        properties: {}
                    };
                    // @ts-ignore
                    j = font.style.length;
                    while (j--) {
                        // @ts-ignore
                        name = font.style.item(j);
                        // @ts-ignore
                        value = font.style.getPropertyValue(name);
                        name !== 'font-family' &&
                            name !== 'src' &&
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
            };
        });
        const result = {
            styles: [...styles],
            fonts: [...usedFonts.values()],
            nodeCount,
            stats: { nodeCount, stats }
        };
        if (options.html) {
            if (!document.querySelector('base')) {
                const base = document.createElement('base');
                base.href = location.protocol + '//' + location.host + location.pathname;
                document.head.insertBefore(base, document.querySelector('meta[charset]')?.nextElementSibling || document.head.firstChild);
            }
            if (!document.querySelector('meta[charset]')) {
                const meta = document.createElement('meta');
                meta.setAttribute('charset', 'utf-8');
                document.head.insertBefore(meta, document.head.firstChild);
            }
            Array.from(document.querySelectorAll('style,link[rel=stylesheet]')).forEach((node) => {
                document.body.append(node);
                if (node.tagName === 'LINK') {
                    if (node.media === 'print') {
                        return;
                    }
                    if (node.hasAttribute('media')) {
                        // @ts-ignore
                        node.setAttribute('data-media', node.media);
                    }
                    // @ts-ignore
                    node.media = 'print';
                    // @ts-ignore
                    node.dataset.async = '';
                }
            });
            // add data-attribute
            const style = document.createElement('style');
            // @ts-ignore
            style.dataset.critical = true;
            const css = [...usedFonts.values()].map((entry) => {
                return '@font-face {' + '\n ' + Object.entries(entry).map((entry) => {
                    return typeof entry[1] == 'string' ? `${entry[0] + ': ' + entry[1]}` : Object.entries(entry[1]).map((entry) => `${entry[0] + ': ' + entry[1]}`).join(';\n ') + '\n}';
                }).join(';\n');
            }).join('\n') +
                '\n' + result.styles.join('\n');
            if (options.transform != null) {
                await options.transform(css).then((parseResult) => style.textContent = parseResult.code);
            }
            else {
                style.textContent = css;
            }
            if (style.innerText.trim() !== '') {
                document.head.insertBefore(style, document.querySelector('base')?.nextElementSibling);
            }
            if (result.fonts.length > 0) {
                const script = document.createElement('script');
                script.textContent = fontscript(result.fonts);
                document.head.append(script);
            }
            options?.signal?.removeEventListener('abort', abortSignal);
            const doctype = document.doctype;
            result.html = (doctype ? `<!Doctype ${doctype.name}`
                + (doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '')
                + (doctype.systemId
                    ? (doctype.publicId ? `` : ` SYSTEM`) + ` "${doctype.systemId}"`
                    : ``)
                + `>` + '\n' : '') + document.documentElement.outerHTML;
        }
        return result;
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
        const url = URL.createObjectURL(new Blob(content, { type: mimetype }));
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

    async function extractAndDownload(filename = 'critical.css', options = {}) {
        return extract(options).
            then(async (content) => download(content.styles, filename, 'text/css; charset=utf-8').
            then(async () => {
            if (content.fonts.length > 0) {
                // @ts-ignore
                return download([fontscript(content.fonts)], filename.replace(/\.css$/, '.js'), 'text/javascript; charset=utf-8');
            }
        }).
            then(() => content));
    }

    exports.download = extractAndDownload;
    exports.extract = extract;
    exports.fontscript = fontscript;

}));
