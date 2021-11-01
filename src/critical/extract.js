import {matchesSelector} from "../css/matchesselector";
import {resolve} from "../file/path";

/**
 * {Object} options
 * - fonts: generate javascript font loading script
 * @returns {Promise<{styles: string[], fonts: object[], stats: object}>}
 */
export async function extract(options = {}) {

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

                allStylesheets.push({rule: rules[l], match: false})
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

                        rules.push({rule:  sheet[l], match: false})
                    }

                    rules.unshift(k + 1, 0);
                    allStylesheets.splice.apply(allStylesheets, rules)
                    allStylesLength = allStylesheets.length

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
                })
            }

            loop2:

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
                            })
                        }

                        return 'url(' + resolve(one, files.get(font.parentStyleSheet).base) + ')' + three;
                    }).trim(),
                    properties: {}
                }

                j = font.style.length;

                while (j--) {

                    name = font.style.item(j);
                    value = font.style.getPropertyValue(name);

                    name != 'font-family' &&
                    name != 'src' &&
                    value !== '' &&
                    value !== undefined &&
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

    return {styles: [...styles], fonts: [...usedFonts.values()], nodeCount, stats: {nodeCount, stats}};
}