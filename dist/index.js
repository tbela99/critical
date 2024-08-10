import * as playwright from 'playwright';
import { devices } from 'playwright';
import { dirname, resolve, basename } from 'node:path';
import { readFileSync } from 'node:fs';
import { size } from './file/size.js';
import { fontscript } from './critical/fontscript.js';
import chalk from 'chalk';
import { parse, expand, walk, EnumToken, render, transform } from '@tbela99/css-parser';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import process from 'node:process';

const __dirname = dirname(new URL(import.meta.url).pathname);
const require = createRequire(import.meta.url);
const script = readFileSync(require.resolve('@tbela99/critical/umd'), { encoding: "utf-8" });
// @ts-ignore
const deviceNames = Object.values(devices);
async function sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration + Math.ceil(Math.random() * 10)));
}
async function createBrowser(options, dimension, chromium, browserName) {
    const launchOptions = {
        headless: options.headless,
        bypassCSP: !options.secure,
        defaultViewport: {
            isMobile: true,
            isLandscape: false,
        },
        waitForInitialPage: false,
        args: [],
        ignoreDefaultArgs: ['--enable-automation']
    };
    launchOptions.args = [
        '--test-type',
        '--no-startup-window',
        `--window-size=${dimension.width},${dimension.height}`
    ];
    if (!options.secure) {
        launchOptions.args.push('--disable-web-security', '--allow-running-insecure-content', '--no-default-browser-check', '--ignore-certificate-errors', '--disable-site-isolation-trials');
    }
    if (options.container) {
        launchOptions.args.push("--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox", "--no-sandbox");
    }
    let contextData = {};
    if (options.browserType != null || options.randomUserAgent || options.randomBrowser) {
        contextData = deviceNames.slice().sort(() => [-1, 0, 1][Math.floor(3 * Math.random())]).filter(d => {
            if (browserName != d.defaultBrowserType) {
                return false;
            }
            if (options.browserType != null) {
                if (options.browserType == 'mobile') {
                    return d.isMobile;
                }
                else {
                    return !d.isMobile;
                }
            }
            return true;
        })[0];
    }
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
        ...contextData,
        bypassCSP: !options.secure,
        viewport: dimension
    });
    if (options.randomUserAgent) {
        // antibot evasion
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
    }
    const page = await context.newPage();
    return { browser, context, page };
}
async function critical(url, options = {}) {
    if (typeof url === 'object') {
        options = url;
        url = options.url;
    }
    let html = '';
    let fonts = new Set;
    const styles = new Set;
    const stats = [];
    const browserName = (options.randomBrowser ? ['chromium', 'firefox', 'webkit', 'edge', 'chrome'][Math.floor(Math.random() * 5)] : options.browser ?? 'chromium');
    const chromium = (['chromium', 'firefox', 'webkit', 'edge', 'chrome'].includes(browserName) &&
        // @ts-ignore
        playwright[browserName]) ?? playwright.chromium ?? 'chromium';
    if (options.input != null) {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(options.input.startsWith('data:') ? options.input : 'data:text/html;base64,' + Buffer.from(options.input).toString('base64'), { waitUntil: 'networkidle' });
        let base = options.base ?? 'file://' + process.cwd();
        if (!base.endsWith('/')) {
            base += '/';
        }
        if (!base.match(/^(([a-zA-Z]+:)?\/)?\//)) {
            base = 'file://' + process.cwd() + '/' + base;
        }
        options.input = await page.evaluate((base) => {
            const baseElement = (document.querySelector('base') ?? document.head.insertBefore(document.createElement('base'), document.head.firstChild));
            baseElement.href = base;
            const doctype = document.doctype;
            return `<!Doctype ${doctype.name}`
                + (doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '')
                + (doctype.systemId
                    ? (doctype.publicId ? `` : ` SYSTEM`) + ` "${doctype.systemId}"`
                    : ``)
                + `>` + '\n' + document.documentElement.outerHTML;
        }, base);
        const dir = await mkdtemp(tmpdir() + '/');
        await writeFile(dir + '/index.html', options.input);
        url = 'file://' + dir + '/index.html';
        // @ts-ignore
        process.on('exit', async () => await rm(dir, { recursive: true, force: true }));
        // @ts-ignore
        process.on('uncaughtException', async () => await rm(dir, { recursive: true, force: true }));
        // @ts-ignore
        process.on('unhandledRejection', async () => await rm(dir, { recursive: true, force: true }));
        await page.close();
        await context.close();
        await browser.close();
    }
    if (['"', "'"].includes(url.charAt(0))) {
        // @ts-ignore
        url = url.replace(/^(['"])([^\1\s]+)\1$/, '$2');
    }
    if (!url.match(/^([a-zA-Z]+:)?\/\//)) {
        url = 'file://' + (url.charAt(0) == '/' ? url : resolve(__dirname + '/' + url));
    }
    options = {
        headless: true,
        randomBrowser: false,
        fonts: true,
        screenshot: false,
        console: false,
        secure: false,
        filename: '',
        container: false,
        html: false,
        pause: 30,
        verbose: false,
        colorScheme: 'dark',
        output: 'output/', ...options, browser: browserName
    };
    let theUrl = new URL(url);
    let filePath = options.output + (options.output.endsWith('/') ? '' : '/') + browserName + (options.browserType != null ? '-' + options.browserType : '') + ('/' + options.colorScheme);
    let shortUrl = theUrl.protocol == 'data:' ? 'data.html' : (theUrl.protocol == 'file:' ? basename(theUrl.pathname) : theUrl.protocol + '//' + theUrl.host + theUrl.pathname);
    let dimensions;
    if (filePath.slice(-1) != '/') {
        filePath += '/';
    }
    if (theUrl.host !== '') {
        filePath += theUrl.host.replace(':', '@') + '/';
    }
    else {
        filePath += 'local_files/';
    }
    if (theUrl.pathname != '/') {
        filePath += basename(theUrl.pathname).replace(/\.[a-z]{1,4}$/, '').replace(/^[^a-zA-Z0-9_-]+/, '').replace(/[^a-zA-Z0-9_-]+/, '-');
    }
    else {
        filePath += 'index';
    }
    // @ts-ignore
    filePath = filePath.replace(/[/]+$/, '');
    await mkdir(dirname(filePath), { recursive: true });
    options.filename = filePath;
    if (options.base != null) {
        if (!options.base.match(/^([a-z]+:\/)?\//)) {
            const parts1 = (filePath.endsWith('/') ? filePath.slice(0, -1) : filePath).split('/');
            const parts2 = (options.base.endsWith('/') ? options.base.slice(0, -1) : options.base).split('/');
            const result = [];
            parts1.pop();
            while (parts1.shift()) {
                result.push('..');
            }
            result.push(...parts2);
            options.base = result.join('/');
        }
    }
    if ('dimensions' in options) {
        dimensions = options.dimensions;
    }
    else {
        dimensions = Number.isInteger(options.width) && Number.isInteger(options.height) ? [{
                width: +options.width,
                height: +options.height
            }] : ['1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'];
    }
    if (dimensions.length == 0) {
        throw new Error(`No dimensions specified`);
    }
    if (typeof dimensions == 'string') {
        dimensions = dimensions.split(/\s/);
    }
    else if (!Array.isArray(dimensions)) {
        dimensions = [dimensions];
    }
    dimensions = dimensions.map((dimension) => {
        if (typeof dimension == 'string') {
            const parts = dimension.split(/[xX"']/g);
            return {
                width: +parts[0],
                height: +parts[1]
            };
        }
        return dimension;
    });
    dimensions.sort(() => [-1, 0, 1][Math.floor(3 * Math.random())]);
    // @ts-ignore
    for (const dimension of dimensions) {
        if (options.verbose || options.console) {
            console.error(chalk.blue(`[${shortUrl}]> selected browser `) + chalk.green(chromium.name()));
            console.error(chalk.blue(`[${shortUrl}${size}]> set viewport to `) + chalk.green(`${dimension.width}x${dimension.height}`));
        }
        const { browser, context, page } = await createBrowser(options, dimension, chromium, browserName);
        try {
            const size = ` (${dimension.width}x${dimension.height})`;
            await context.addInitScript(script + ';window.critical=critical;');
            await page.emulateMedia({
                colorScheme: options.colorScheme,
            });
            if (options.console) {
                page.on('console', (message) => 
                // @ts-ignore
                console.error(chalk.yellow(`[${shortUrl}${size}]> ${message.type().replace(/^([a-z])/, (all, one) => one.toUpperCase())} ${message.text()}`)))
                    // @ts-ignore
                    .on('pageerror', ({ message }) => console.error(chalk.red(`[${shortUrl}${size}]> ${message}`)))
                    .on('requestfailed', (request) => {
                    const failure = request.failure();
                    console.error(chalk.red(`[${shortUrl}${size}]> ${failure && failure.errorText} ${request.url()}`));
                });
            }
            console.error(chalk.blue(`[${shortUrl}${size}]> open `) + url);
            if (options.input != null) {
                const dir = await mkdtemp(tmpdir() + '/');
                await writeFile(dir + '/index.html', options.input);
                url = 'file://' + dir + '/index.html';
                // @ts-ignore
                process.on('exit', async () => await rm(dir, { recursive: true }));
                // @ts-ignore
                process.on('uncaughtException', async () => await rm(dir, { recursive: true }));
                // @ts-ignore
                process.on('unhandledRejection', async () => await rm(dir, { recursive: true }));
            }
            await page.goto(url, { waitUntil: 'networkidle' });
            if (options.screenshot) {
                const screenshot = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || { path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png' };
                if (dimensions.length > 1) {
                    screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`);
                }
                if (options.verbose) {
                    console.error(chalk.blue(`[${shortUrl}${size}]> generating screenshot at `) + chalk.green(screenshot.path));
                }
                await page.screenshot(screenshot);
            }
            if (options.verbose) {
                console.error(chalk.blue(`[${shortUrl}${size}]> collect critical data`));
            }
            const data = await page.evaluate(async (param) => {
                // @ts-ignore
                return await critical.extract(param.options).then((result) => {
                    if (Array.isArray(result.fonts)) {
                        // @ts-ignore
                        result.fonts = (result.fonts).map((font) => JSON.stringify(font));
                    }
                    // @ts-ignore
                    if (param.options.verbose) {
                        console.error(JSON.stringify({ result }, null, 1));
                    }
                    return result;
                });
            }, { options });
            if (data.styles != null) {
                data.styles.forEach((line) => styles.add(line));
                data.fonts.forEach((line) => fonts.add(line));
                stats.push({ width: dimension.width, height: dimension.height, stats: data.stats });
                if (options.html != null && html === '') {
                    html = data.html ?? '';
                }
            }
        }
        catch (error) {
            console.error(error);
        }
        finally {
            await page.close();
            await context.close();
            await browser.close();
        }
        if (options.pause > 0) {
            await sleep(options.pause);
        }
    }
    let htmlFile = undefined;
    let fontJS = undefined;
    let minCssFile = undefined;
    let rawCssFile = undefined;
    let nestedCssFile = undefined;
    let minNestedCssFile = undefined;
    if (options.filename != null) {
        let rawCSS = [...styles].join('\n');
        let css = rawCSS;
        if (options.advanced) {
            const { browser, context, page } = await createBrowser(options, dimensions[0], chromium, browserName);
            await page.emulateMedia({
                colorScheme: options.colorScheme,
            });
            const dimension = dimensions[0];
            const size = ` (${dimension.width}x${dimension.height})`;
            console.error(chalk.blue(`[${shortUrl}${size}]> open `) + url);
            if (options.input != null) {
                const dir = await mkdtemp(tmpdir() + '/');
                await writeFile(dir + '/index.html', options.input);
                url = 'file://' + dir + '/index.html';
                // @ts-ignore
                process.on('exit', async () => await rm(dir, { recursive: true }));
                // @ts-ignore
                process.on('uncaughtException', async () => await rm(dir, { recursive: true, force: true }));
                // @ts-ignore
                process.on('unhandledRejection', async () => await rm(dir, { recursive: true, force: true }));
            }
            await page.goto(url, { waitUntil: 'networkidle' });
            const result = await parse(rawCSS, { minify: false }).then(result => Object.assign(result, { ast: expand(result.ast) }));
            for (const { node, parent } of walk(result.ast)) {
                if (node.typ == EnumToken.RuleNodeType) {
                    const filtered = await Promise.all(splitRule(node.sel).map(async (sel) => {
                        const rule = sel.filter(sel => !sel.match(/::?((before)|(after))/));
                        if (rule.length == 0) {
                            return sel;
                        }
                        return await page.evaluate((param) => document.querySelector(param.sel) != null, { sel: rule.join('') }) ? sel : [];
                    })).then((r) => r.filter((r) => r.length > 0));
                    if (filtered.length == 0) {
                        parent.chi.splice(parent.chi.indexOf(node), 1);
                    }
                    else {
                        node.sel = filtered.reduce((acc, curr) => acc + (acc.length == 0 ? '' : ',') + curr.join(''), '');
                    }
                }
            }
            css = render(result.ast, { minify: false, expandNestingRules: true }).code;
            await page.close();
            await context.close();
            await browser.close();
        }
        const { code, unminified } = (await transform(css, { expandNestingRules: true }).then(result => {
            return { code: result.code, unminified: render(result.ast, { minify: false, expandNestingRules: true }).code };
        }));
        const { code: nestedCSS, unminified: nestedUnminified } = (await transform(css, { nestingRules: true }).then(result => {
            return { code: result.code, unminified: render(result.ast, { minify: false }).code };
        }));
        let cssFile = options.filename;
        if (cssFile.slice(-4) != '.css') {
            cssFile += '.css';
        }
        minCssFile = cssFile.slice(0, -4) + '.min.css';
        rawCssFile = cssFile.slice(0, -4) + '.raw.css';
        minNestedCssFile = cssFile.slice(0, -4) + '.nested.min.css';
        nestedCssFile = cssFile.slice(0, -4) + '.nested.css';
        console.error(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(minCssFile + ' [' + size(code.length) + ']'));
        // @ts-ignore
        await writeFile(minCssFile, code);
        console.error(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(cssFile + ' [' + size(unminified.length) + ']'));
        await writeFile(cssFile, unminified);
        // @ts-ignore
        await writeFile(rawCssFile, rawCSS);
        console.error(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(minNestedCssFile + ' [' + size(nestedCSS.length) + ']'));
        // @ts-ignore
        await writeFile(minNestedCssFile, nestedCSS);
        console.error(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(nestedCssFile + ' [' + size(nestedUnminified.length) + ']'));
        await writeFile(nestedCssFile, nestedUnminified);
        // @ts-ignore
        await writeFile(rawCssFile, rawCSS);
        if (options.html != null && html != null && html !== '') {
            const match = html.match(/<style data-critical="true">((.|[\r\n])*?)<\/style>/);
            if (match) {
                html = html.replace(match[0], `<style data-critical="true">${css}</style>`);
            }
            htmlFile = options.filename + '.html';
            // @ts-ignore
            await writeFile(htmlFile, html);
        }
    }
    const fontObjects = new Set([...fonts].map((font) => JSON.parse(font)));
    if (options.fonts) {
        let fontJS = options.filename;
        let data = '/* no font found! */';
        if (fontJS.slice(-3) != '.js') {
            fontJS += '.js';
        }
        if (fontObjects.size == 0) {
            console.error(chalk.yellow(`[${shortUrl}]> no preload font found`));
        }
        else {
            data = fontscript([...fontObjects]);
            console.error(chalk.blue(`[${shortUrl}]> writing `) + chalk.green(fontObjects.size.toString()) + chalk.blue(` preload font script at `) +
                chalk.green(`${fontJS} [` + size(data.length) + ']'));
        }
        // @ts-ignore
        await writeFile(fontJS, data);
    }
    return {
        styles: [...styles],
        files: {
            html: htmlFile,
            fonts: fontJS,
            css: {
                min: minCssFile,
                raw: rawCssFile,
                nested: nestedCssFile,
                minNested: minNestedCssFile
            }
        }, fonts: [...fonts], stats, html
    };
}
function isWhiteSpace(codepoint) {
    return codepoint == 0x9 || codepoint == 0x20 ||
        // isNewLine
        codepoint == 0xa || codepoint == 0xc || codepoint == 0xd;
}
function splitRule(buffer) {
    const result = [[]];
    let str = '';
    for (let i = 0; i < buffer.length; i++) {
        let chr = buffer.charAt(i);
        if (isWhiteSpace(chr.charCodeAt(0))) {
            let k = i;
            while (k + 1 < buffer.length) {
                if (isWhiteSpace(buffer[k + 1].charCodeAt(0))) {
                    k++;
                    continue;
                }
                break;
            }
            if (str !== '') {
                // @ts-ignore
                result.at(-1).push(str);
                str = '';
            }
            // @ts-ignore
            if (result.at(-1).length > 0) {
                // @ts-ignore
                result.at(-1).push(' ');
            }
            i = k;
            continue;
        }
        if (chr == ',') {
            if (str !== '') {
                // @ts-ignore
                result.at(-1).push(str);
                str = '';
            }
            result.push([]);
            continue;
        }
        if (chr == ':') {
            if (str !== '') {
                // @ts-ignore
                result.at(-1).push(str);
                str = '';
            }
            if (buffer.charAt(i + 1) == ':') {
                chr += buffer.charAt(++i);
            }
            str += chr;
            continue;
        }
        str += chr;
        if (chr == '\\') {
            str += buffer.charAt(++i);
            continue;
        }
        if (chr == '"' || chr == "'") {
            let k = i;
            while (++k < buffer.length) {
                chr = buffer.charAt(k);
                str += chr;
                if (chr == '//') {
                    str += buffer.charAt(++k);
                    continue;
                }
                if (chr == buffer.charAt(i)) {
                    break;
                }
            }
            continue;
        }
        if (chr == '(' || chr == '[') {
            const open = chr;
            const close = chr == '(' ? ')' : ']';
            let inParens = 1;
            let k = i;
            while (++k < buffer.length) {
                chr = buffer.charAt(k);
                if (chr == '\\') {
                    str += buffer.slice(k, k + 2);
                    k++;
                    continue;
                }
                str += chr;
                if (chr == open) {
                    inParens++;
                }
                else if (chr == close) {
                    inParens--;
                }
                if (inParens == 0) {
                    break;
                }
            }
            i = k;
        }
    }
    if (str !== '') {
        // @ts-ignore
        result.at(-1).push(str);
    }
    return result;
}

export { critical, isWhiteSpace, splitRule };
//# sourceMappingURL=index.js.map
