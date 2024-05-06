import {resolve} from "../file/path";
import {fontscript} from "./fontscript";
import {
    CriticalExtractOptions,
    CriticalResult,
    FileMapObject,
    FontObject,
    MatchCSSStyleSheet,
    RuleList
} from "../@types";

export async function extract(options: CriticalExtractOptions = {}) {

    const document: Document = window.document;
    const location: Location = window.location;
    const styles: Set<string> = new Set;
    const excluded = ['all', 'print', ''];
    const allStylesheets: MatchCSSStyleSheet[] = [];

    // Get a list of all the elements in the view.
    const height = window.innerHeight;
    const walker = document.createNodeIterator(document, NodeFilter.SHOW_ELEMENT, {acceptNode: () => NodeFilter.SHOW_ELEMENT});

    const fonts: Set<CSSFontFaceRule> = new Set;
    const fontFamilies: Set<string> = new Set;
    const files: Map<CSSStyleSheet, FileMapObject> = new Map;
    const weakMap: WeakMap<RuleList | CSSStyleSheet, number> = new WeakMap;
    const nodeMap: Set<Node> = new Set;
    let nodeCount: number = 0;
    let k: number;
    let rule: CSSMediaRule | CSSStyleRule;
    let rules;

    performance.mark('filterStylesheets');

    for (k = 0; k < document.styleSheets.length; k++) {

        // @ts-ignore
        rule = <CSSMediaRule>document.styleSheets[k];

        if (rule.media.mediaText === 'print' || (rule.media.mediaText !== '' && !window.matchMedia(rule.media.mediaText).matches)) {

            continue;
        }

        try {


            // @ts-ignore
            rules = (<CSSStyleSheet>rule).cssRules ?? (<CSSStyleSheet>rule).rules;

            for (let l = 0; l < rules.length; l++) {

                allStylesheets.push({rule: rules[l], match: false})
            }

        } catch (e) {

            // @ts-ignore
            console.error(JSON.stringify({'message': e.message, stylesheet: rule.href}, null, 1));
        }
    }

    performance.measure('filter stylesheets', 'filterStylesheets');

    if (allStylesheets.length === 0) {

        return {styles: [], fonts: [], stats: {}};
    }

    let node;
    let rect;
    let allStylesLength = allStylesheets.length;

    performance.mark('nodeWalking');

    while ((node = <HTMLElement>walker.nextNode())) {

        if (options && options.signal && options.signal.aborted) {

            return Promise.reject('Aborted');
        }

        if (['SCRIPT', 'LINK', 'HEAD', 'META', 'TITLE', 'NOSCRIPT'].includes(node.tagName)) {

            continue;
        }

        nodeCount++;
        rect = node.getBoundingClientRect();

        if (rect.top < height) {

            nodeMap.add(node);
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

                match = true
            } else {

                if (selector.match(/::?((before)|(after))/)) {

                    selector = selector.replace(/::?((before)|(after))\s*((,)|$)/g, '$5');
                }

                try {

                    match = nodeMap.has(document.querySelector(selector));
                } catch (e) {

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

        } else if (allStylesheets[k].rule instanceof CSSMediaRule || allStylesheets[k].rule instanceof CSSImportRule || allStylesheets[k].rule instanceof CSSConditionRule) {

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

                        rules.push({rule: sheet[l], match: false})
                    }
                }

                if (rules.length > 0) {

                    // @ts-ignore
                    allStylesheets.splice.apply(allStylesheets, [k + 1, 0].concat(rules))
                    allStylesLength = allStylesheets.length
                }
            } catch (e) {

                // @ts-ignore
                console.error(JSON.stringify({'message': e.message, stylesheet: rule.href}, null, 1));
            }
        } else if (allStylesheets[k].rule instanceof CSSFontFaceRule) {

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

    loop1:
        for (let k = 0; k < allStylesLength; k++) {

            if (!allStylesheets[k].match) {

                continue;
            }

            // @ts-ignore
            rule = allStylesheets[k].rule;
            let fileUpdate = false;

            // @ts-ignore
            if (!files.has(rule.parentStyleSheet)) {

                //
                // @ts-ignore
                files.set(rule.parentStyleSheet, {

                    // @ts-ignore
                    base: (rule.parentStyleSheet.href && rule.parentStyleSheet.href.replace(/[?#].*/, '') || location.pathname).replace(/([^/]+)$/, ''),
                    // @ts-ignore
                    file: rule.parentStyleSheet.href || `inline style #${++inlineCount}`
                });

                fileUpdate = true;
            } else { // @ts-ignore
                if (file != null && file !== files.get(rule.parentStyleSheet).file) {

                    fileUpdate = true;
                }
            }

            if (fileUpdate) {

                try {

                    // @ts-ignore
                    console.log('analysing ' + files.get(rule.parentStyleSheet).file);
                    // @ts-ignore
                    styles.add('/* file: ' + files.get(rule.parentStyleSheet).file + ' */');
                } catch (e) {

                    // @ts-ignore
                    console.error(JSON.stringify(e.message, null, 1));
                    console.error(JSON.stringify(rule?.parentStyleSheet?.href, null, 1));
                }
            }

            file = (<FileMapObject>files.get(<CSSStyleSheet>rule.parentStyleSheet)).file;
            css = rule.cssText;

            if (file !== 'inline') {

                // resolve url()
                css = css.replace(/url\(([^)%\s]*?)\)/g, function (all, one) {

                    one = one.trim();

                    if (one.match(/^['"]?data:/)) {

                        return all;
                    }

                    one = one.replace(/^(['"])([^\1\s]+)\1/, '$2');

                    // @ts-ignore
                    return 'url(' + resolve(one, files.get(rule.parentStyleSheet).base) + ')';
                })
            }

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

    if (options.fonts) {

        let j;
        let name;
        let value;
        let font: CSSFontFaceRule;
        let fontObject;
        let src;

        performance.mark('fontsExtraction');

        for (font of fonts) {

            if (font.style.getPropertyValue('font-family').split(/\s*,\s*/).some(token => {

                return fontFamilies.has(token.replace(/(['"])([^\1\s]+)\1/, '$2'));
            })) {

                src = font.style.getPropertyValue('src');

                if (!src) {

                    continue;
                }

                fontObject = {
                    'fontFamily': font.style.getPropertyValue('font-family').replace(/(['"])([^\1\s]+)\1/, '$2'),
                    src: src.replace(/(^|[,\s*])local\([^)]+\)\s*,?\s*?/g, '').replace(/url\(([^)%\s]+)\)([^,]*)(,?)\s*/g, (all, one, two, three) => {

                        one = one.replace(/(['"])([^\1\s]+)\1/, '$2');

                        // @ts-ignore
                        if (!files.has(font.parentStyleSheet)) {

                            // @ts-ignore
                            if (!font.parentStyleSheet.href) {

                                return all;
                            }

                            // @ts-ignore
                            files.set(font.parentStyleSheet, {

                                // @ts-ignore
                                base: font.parentStyleSheet.href.replace(/([^/]+)$/, ''),
                                // @ts-ignore
                                file: font.parentStyleSheet.href
                            })

                        }

                        // @ts-ignore
                        return 'url(' + resolve(one, files.get(font.parentStyleSheet).base) + ')' + three;
                    }).trim(),
                    properties: {}
                }

                j = font.style.length;

                while (j--) {

                    name = font.style.item(j);
                    value = font.style.getPropertyValue(name);

                    name !== 'font-family' &&
                    name !== 'src' &&
                    value !== '' &&
                    value !== undefined &&
                    // @ts-ignore
                    (fontObject.properties[name.replace(/([A-Z])/g, (all, name) => '-' + name.toLowerCase())] = value)
                }

                usedFonts.set(JSON.stringify(fontObject), fontObject)
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


    const result: CriticalResult = {
        styles: [...styles],
        fonts: [...usedFonts.values()],
        nodeCount,
        stats: {nodeCount, stats}
    };

    if (options.html) {

        if (!document.querySelector('base')) {

            const base = document.createElement('base');

            base.href = location.protocol + '//' + location.host + location.pathname;
            document.head.insertBefore(base, document.querySelector('meta[charset]')?.nextElementSibling || document.head.firstChild)
        }

        if (!document.querySelector('meta[charset]')) {

            const meta = document.createElement('meta');
            meta.setAttribute('charset', 'utf-8');
            document.head.insertBefore(meta, document.head.firstChild)
        }

        // @ts-ignore
        Array.from(document.querySelectorAll('style,link[rel=stylesheet]')).forEach((node: HTMLLinkElement | HTMLStyleElement) => {

            document.body.append(node);

            if (node.tagName === 'LINK') {

                if (node.media === 'print') {

                    return
                }

                if (node.hasAttribute('media')) {

                    node.setAttribute('data-media', node.media);
                }

                node.media = 'print';
                node.dataset.async = '';
            }
        });

        const script: HTMLScriptElement = document.createElement('script');

        script.textContent = `
        window.addEventListener('DOMContentLoaded', () => Array.from(document.querySelectorAll('link[data-async]')).forEach(node => {

                if(!node.hasAttribute('data-media')) {
                    node.removeAttribute('media');
                }
                else {
                    node.media=node.dataset.media;
                    node.removeAttribute('data-media')
                }
                
                node.removeAttribute('data-async');
        }))`;

        document.head.append(script);

        // add data-attribute
        const style: HTMLStyleElement = document.createElement('style');
        // @ts-ignore
        style.dataset.critical = true;
        style.textContent = [...usedFonts.values()].map((entry) => {

                return '@font-face {' + '\n ' + Object.entries(entry).map(entry => {

                    // @ts-ignore
                    return typeof entry[1] == 'string' ? `${entry[0] + ': ' + entry[1]}` : Object.entries(entry[1]).map(entry => `${entry[0] + ': ' + entry[1]}`).join(';\n ') + '\n}'
                }).join(';\n')
            }).join('\n') +
            '\n' + (<string[]>result.styles).join('\n');

        if (style.textContent.trim() !== '') {

            document.head.insertBefore(style, <HTMLBaseElement | null>document.querySelector('base')?.nextElementSibling);
        }

        if ((<FontObject[]>result.fonts).length > 0) {

            const script = document.createElement('script');
            script.textContent = fontscript(<FontObject[]>result.fonts);
            document.head.append(script);
        }

        const doctype: DocumentType = document.doctype as DocumentType;

        result.html = `<!Doctype ${doctype.name}`
            + (doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '')
            + (doctype.systemId
                ? (doctype.publicId ? `` : ` SYSTEM`) + ` "${doctype.systemId}"`
                : ``)
            + `>` + '\n' + document.documentElement.outerHTML
    }

    return result;
}