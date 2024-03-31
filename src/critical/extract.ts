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
import {TransformResult} from "@tbela99/css-parser";

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
export async function extract(options: CriticalExtractOptions): Promise<CriticalResult> {

    const document: Document = window.document;
    const location: Location = window.location;
    const styles: Set<string> = new Set<string>;
    const excluded: string[] = ['all', 'print', ''];
    const allStylesheets: MatchCSSStyleSheet[] = new Array<MatchCSSStyleSheet>();

    // Get a list of all the elements in the view.
    const height: number = window.innerHeight;
    const walker: NodeIterator = document.createNodeIterator(document, NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (): number {
            return NodeFilter.SHOW_ELEMENT;
        }
    });

    const fonts: Set<RuleList> = new Set<RuleList>();
    const fontFamilies: Set<string> = new Set;
    const files: Map<CSSStyleSheet, FileMapObject> = new Map;
    const weakMap: WeakMap<RuleList | CSSStyleSheet, number> = new WeakMap;
    const nodeMap: WeakMap<Node, number> = new WeakMap;
    let nodeCount: number = 0;
    let k;
    let rule: RuleList;
    let rules: CSSRuleList;

    options.signal?.addEventListener('abort', abortSignal);

    performance.mark('filterStylesheets');

    for (k = 0; k < document.styleSheets.length; k++) {

        rule = document.styleSheets[k];

        if (rule.media.mediaText == 'print' || (rule.media.mediaText !== '' && !window.matchMedia(rule.media.mediaText).matches)) {

            continue;
        }

        try {

            rules = rule.cssRules || rule.rules;

            for (let l = 0; l < rules.length; l++) {

                allStylesheets.push({rule: rules[l], match: false})
            }

        } catch (e: any) {

            console.error(JSON.stringify({'message': e.message + '\n' + e.stack, stylesheet: rule.href}, null, 1));
        }
    }

    performance.measure('filter stylesheets', 'filterStylesheets');

    if (allStylesheets.length === 0) {

        const doctype = document.doctype;

        return options.html ? {
            html: (doctype ? `<!Doctype ${doctype.name}`
                + (doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '')
                + (doctype.systemId
                    ? (doctype.publicId ? `` : ` SYSTEM`) + ` "${doctype.systemId}"`
                    : ``)
                + `>` + '\n' : '') + document.documentElement.outerHTML
        } : {};
    }

    let node: Element;
    let rect;
    let allStylesLength = allStylesheets.length;

    performance.mark('nodeWalking');

    // @ts-ignore
    while ((node = walker.nextNode())) {

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
                    allStylesheets[k].rule.style.getPropertyValue('font-family').split(/\s*,\s*/).forEach(fontFamily => fontFamily != 'inherit' && fontFamilies.add(fontFamily.replace(/(['"])([^\1\s]+)\1/, '$2')));
                }
            }

        } else if (allStylesheets[k].rule instanceof CSSMediaRule || allStylesheets[k].rule instanceof CSSImportRule || allStylesheets[k].rule instanceof CSSConditionRule) {

            // @ts-ignore
            if ((allStylesheets[k].rule instanceof CSSMediaRule || allStylesheets[k].rule instanceof CSSImportRule) && (allStylesheets[k].rule.media.mediaText === 'print' || (allStylesheets[k].rule.media.mediaText !== '' && !window.matchMedia(allStylesheets[k].rule.media.mediaText).matches))) {
                continue;
            }

            try {

                const rule = allStylesheets[k].rule;
                const rules: RuleList[] = [];

                // @ts-ignore
                const sheet = rule instanceof CSSImportRule ? rule.styleSheet.cssRules || rule.styleSheet.rules : rule.cssRules || rule.rules;

                for (let l = 0; l < sheet.length; l++) {

                    if (!weakMap.has(sheet[l])) {

                        // @ts-ignore
                        rules.push({rule: sheet[l], match: false})
                    }
                }

                if (rules.length > 0) {

                    // @ts-ignore
                    allStylesheets.splice.apply(allStylesheets, [k + 1, 0].concat(rules))
                    allStylesLength = allStylesheets.length
                }
            } catch (e: any) {

                // @ts-ignore
                console.error(JSON.stringify({'message': e.message + '\n' + e.stack, stylesheet: rule.href}, null, 1));
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

            rule = allStylesheets[k].rule;
            let fileUpdate = false;

            if (!files.has(<CSSStyleSheet>rule.parentStyleSheet)) {

                //
                files.set(<CSSStyleSheet>rule.parentStyleSheet, {

                    // @ts-ignore
                    base: (rule.parentStyleSheet.href && rule.parentStyleSheet.href.replace(/[?#].*/, '') || location.pathname).replace(/([^/]+)$/, ''),
                    // @ts-ignore
                    file: rule.parentStyleSheet.href || `inline style #${++inlineCount}`
                });

                fileUpdate = true;
            } else if (file && file != (<FileMapObject>files.get(<CSSStyleSheet>rule.parentStyleSheet)).file) {

                fileUpdate = true;
            }

            if (fileUpdate) {

                // @ts-ignore
                try {

                    console.log('analysing ' + (<FileMapObject>files.get(<CSSStyleSheet>rule.parentStyleSheet)).file);
                    styles.add('/* file: ' + (<FileMapObject>files.get(<CSSStyleSheet>rule.parentStyleSheet)).file + ' */');
                } catch (e: any) {

                    console.error(JSON.stringify(e.message + '\n' + e.stack, null, 1));
                    console.error(JSON.stringify(rule?.parentStyleSheet?.href, null, 1));
                }
            }

            file = (<FileMapObject>files.get(<CSSStyleSheet>rule.parentStyleSheet)).file;
            // @ts-ignore
            css = rule.cssText;

            if (file != 'inline') {

                // resolve url()
                css = css.replace(/url\(([^)%\s]*?)\)/g, function (all: string, one: string) {

                    one = one.trim();

                    if (one.match(/^['"]?data:/)) {

                        return all;
                    }

                    one = one.replace(/^(['"])([^\1\s]+)\1/, '$2');

                    return 'url(' + resolve(one, (<FileMapObject>files.get(<CSSStyleSheet>rule.parentStyleSheet)).base) + ')';
                })
            }

            // loop2:

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

                let media: string = rule.parentStyleSheet.media.mediaText;

                if (media == 'print') {

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

    const usedFonts: Map<string, FontObject> = new Map<string, FontObject>;

    // @ts-ignore
    if (options.fonts) {

        let j;
        let name;
        let value;
        let font: RuleList;
        let fontObject: FontObject;
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
                    src: src.replace(/(^|[,\s*])local\([^)]+\)\s*,?\s*?/g, '').replace(/url\(([^)%\s]+)\)([^,]*)(,?)\s*/g, (all: string, one: string, two: string, three: string) => {

                        one = one.replace(/(['"])([^\1\s]+)\1/, '$2');

                        if (!files.has(<CSSStyleSheet>font.parentStyleSheet)) {

                            if (!(<CSSStyleSheet>font.parentStyleSheet).href) {

                                return all;
                            }

                            files.set(<CSSStyleSheet>font.parentStyleSheet, {

                                // @ts-ignore
                                base: font.parentStyleSheet.href.replace(/([^/]+)$/, ''),
                                // @ts-ignore
                                file: font.parentStyleSheet.href
                            })
                        }

                        return 'url(' + resolve(one, (<FileMapObject>files.get(<CSSStyleSheet>font.parentStyleSheet)).base) + ')' + three;
                    }).trim(),
                    properties: {}
                }

                // @ts-ignore
                j = font.style.length;

                while (j--) {

                    // @ts-ignore
                    name = font.style.item(j);
                    // @ts-ignore
                    value = font.style.getPropertyValue(name);

                    name != 'font-family' &&
                    name != 'src' &&
                    value !== '' &&
                    value !== undefined &&
                    (fontObject.properties[name.replace(/([A-Z])/g, (all: string, name: string) => '-' + name.toLowerCase())] = value)
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
        fonts: <FontObject[]>[...usedFonts.values()],
        nodeCount,
        stats: {nodeCount, stats}
    };

    if (options.html) {

        if (!document.querySelector('base')) {

            const base: HTMLBaseElement = document.createElement('base');

            base.href = location.protocol + '//' + location.host + location.pathname;
            document.head.insertBefore(base, document.querySelector('meta[charset]')?.nextElementSibling || document.head.firstChild)
        }

        if (!document.querySelector('meta[charset]')) {

            const meta: HTMLMetaElement = document.createElement('meta');
            meta.setAttribute('charset', 'utf-8');
            document.head.insertBefore(meta, document.head.firstChild)
        }

        Array.from((<NodeListOf<HTMLStyleElement | HTMLLinkElement>>document.querySelectorAll('style,link[rel=stylesheet]'))).forEach((node: HTMLStyleElement | HTMLLinkElement) => {

            document.body.append(node);

            if (node.tagName == 'LINK') {

                if (node.media == 'print') {

                    return
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

        // inject page link[rel=stylesheet]
        // const script = document.createElement('script');
        //
        // script.textContent = `
        // window.addEventListener('DOMContentLoaded', () => Array.from(document.querySelectorAll('link[data-async]')).forEach(node => {
        //
        //         if(!node.hasAttribute('data-media')) {
        //             node.removeAttribute('media');
        //         }
        //         else {
        //             node.media=node.dataset.media;
        //             node.removeAttribute('data-media')
        //         }
        //
        //         node.removeAttribute('data-async');
        // }))`;
        //
        // document.head.append(script);

        // add data-attribute
        const style: HTMLStyleElement = document.createElement('style');
        // @ts-ignore
        style.dataset.critical = true;
        const css: string = [...usedFonts.values()].map((entry: FontObject): string => {

                return '@font-face {' + '\n ' + Object.entries(entry).map((entry: [string, string | {
                    [key: string]: string
                }]): string => {

                    return typeof entry[1] == 'string' ? `${entry[0] + ': ' + entry[1]}` : Object.entries(entry[1]).map((entry: [string, string]): string => `${entry[0] + ': ' + entry[1]}`).join(';\n ') + '\n}'
                }).join(';\n')
            }).join('\n') +
            '\n' + (<string[]>result.styles).join('\n');

        if (options.transform != null) {

            await options.transform(css).then((parseResult: TransformResult) => style.textContent = parseResult.code);
        }

        if (style.innerText.trim() !== '') {

            document.head.insertBefore(style, (<HTMLBaseElement>document.querySelector('base'))?.nextElementSibling);
        }

        if ((<string[]>result.fonts).length > 0) {

            const script: HTMLScriptElement = document.createElement('script');
            script.textContent = fontscript(<FontObject[]>result.fonts);
            document.head.append(script);
        }

        options.signal?.removeEventListener('abort', abortSignal);

        const doctype: DocumentType | null = document.doctype;

        result.html = (doctype ? `<!Doctype ${doctype.name}`
            + (doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '')
            + (doctype.systemId
                ? (doctype.publicId ? `` : ` SYSTEM`) + ` "${doctype.systemId}"`
                : ``)
            + `>` + '\n' : '') + document.documentElement.outerHTML
    }

    return result;
}