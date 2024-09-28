import * as playwright from "playwright";
import {Browser, BrowserContext, BrowserType, ConsoleMessage, devices, LaunchOptions, Page, Request} from "playwright";
import {basename, dirname, resolve} from "node:path";
import {readFileSync} from "node:fs";
import {fontscript} from "./critical";
import {size} from "./file";
import type {
    BrowserOptions,
    CriticalCliResult,
    CriticalCliStats,
    CriticalDimension,
    CriticalExtractOptions,
    CriticalOptions,
    CriticalResult,
    FontObject
} from "./@types/index.d.ts";
import chalk from "chalk";
import {AstRule, EnumToken, expand, parse, render, transform, walk} from "@tbela99/css-parser";
import {createRequire} from 'node:module';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import process from "node:process";
import {Buffer} from "node:buffer";

const __dirname: string = dirname(new URL(import.meta.url).pathname);
const require = createRequire(import.meta.url);

const script: string = readFileSync(require.resolve('@tbela99/critical/umd'), {encoding: "utf-8"});

// @ts-ignore
const deviceNames: Array<{
    userAgent: string;
    viewport: any[];
    screen: any[];
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
    defaultBrowserType: string;
}> = Object.values(devices);

interface Document {

}

interface DocumentType {
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DocumentType/publicId) */
    readonly publicId: string;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DocumentType/systemId) */
    readonly systemId: string;
}

async function sleep(duration: number) {

    return new Promise(resolve => setTimeout(resolve, duration + Math.ceil(Math.random() * 10)));
}

async function createBrowser(options: CriticalOptions, dimension: CriticalDimension, chromium: BrowserType, browserName: "chromium" | "firefox" | "webkit" | "edge" | "chrome"): Promise<{

    browser: Browser,
    context: BrowserContext,
    page: Page
}> {
    const launchOptions: LaunchOptions = <LaunchOptions>{
        headless: options.headless,
        bypassCSP: !options.secure,
        defaultViewport: {
            isMobile: true,
            isLandscape: false,
        },
        waitForInitialPage: false,
        args: <string[]>[],
        ignoreDefaultArgs: ['--enable-automation']
    };

    launchOptions.args = [
        '--test-type',
        '--no-startup-window',
        `--window-size=${(<CriticalDimension>dimension).width},${(<CriticalDimension>dimension).height}`
    ];

    if (!options.secure) {

        launchOptions.args.push(
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--no-default-browser-check',
            '--ignore-certificate-errors',
            '--disable-site-isolation-trials'
        )
    }

    if (options.container) {

        launchOptions.args.push(
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-sandbox"
        )
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
                } else {

                    return !d.isMobile;
                }
            }

            return true;
        })[0];
    }

    const browser: Browser = <Browser>await chromium.launch(launchOptions);
    const context: BrowserContext = <BrowserContext>await browser.newContext({
        ...contextData,
        bypassCSP: !options.secure,
        viewport: dimension
    });

    if (options.randomUserAgent) {

        // antibot evasion
        await context.addInitScript(() => {

            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        });
    }

    const page: Page = await context.newPage();
    return {browser, context, page};
}

/**
 * execute critical css generation
 */
export async function critical(options: CriticalOptions): Promise<CriticalCliResult>;

/**
 * execute critical css generation
 */
export async function critical(url: string, options: CriticalOptions): Promise<CriticalCliResult>;

export async function critical(url: string | CriticalOptions, options: CriticalOptions = {}): Promise<CriticalCliResult> {

    if (typeof url === 'object') {

        options = <CriticalOptions>url;
        url = <string>options.url;
    }

    let html: string = '';
    let fonts: Set<string> = new Set<string>;

    const styles: Set<string> = new Set<string>;
    const stats: CriticalCliStats[] = [];
    const browserName: BrowserOptions = <BrowserOptions>(options.randomBrowser ? ['chromium', 'firefox', 'webkit', 'edge', 'chrome'][Math.floor(Math.random() * 5)] : options.browser ?? 'chromium');
    const chromium: BrowserType = <BrowserType>(['chromium', 'firefox', 'webkit', 'edge', 'chrome'].includes(browserName) &&
        // @ts-ignore
        playwright[browserName]) ?? <string>playwright.chromium ?? 'chromium';

    if (options.input != null) {

        const browser: Browser = <Browser>await chromium.launch({headless: true});
        const context: BrowserContext = <BrowserContext>await browser.newContext();

        const page: Page = await context.newPage();

        await page.goto(options.input.startsWith('data:') ? options.input : 'data:text/html;base64,' + Buffer.from(options.input).toString('base64'), {waitUntil: 'networkidle'});

        let base: string = options.base ?? 'file://' + process.cwd();

        if (!base.endsWith('/')) {

            base += '/';
        }

        if (!base.match(/^(([a-zA-Z]+:)?\/)?\//)) {

            base = 'file://' + process.cwd() + '/' + base;
        }

        options.input = await page.evaluate((base: string) => {

            // @ts-ignore
            const baseElement = (document.querySelector('base') ?? document.head.insertBefore(document.createElement('base'), document.head.firstChild)) as HTMLBaseElement;
            baseElement.href = base;

            // @ts-ignore
            const doctype = document.doctype as DocumentType;
            // @ts-ignore
            return `<!Doctype ${doctype.name}`
                + (doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '')
                + (doctype.systemId
                    ? (doctype.publicId ? `` : ` SYSTEM`) + ` "${doctype.systemId}"`
                    : ``)
                // @ts-ignore
                + `>` + '\n' + document.documentElement.outerHTML
        }, base) as string;

        const dir: string = await mkdtemp(tmpdir() + '/');

        await writeFile(dir + '/index.html', options.input);
        url = 'file://' + dir + '/index.html';

        // @ts-ignore
        process.on('exit', async () => await rm(dir, {recursive: true, force: true}));
        // @ts-ignore
        process.on('uncaughtException', async () => await rm(dir, {recursive: true, force: true}));
        // @ts-ignore
        process.on('unhandledRejection', async () => await rm(dir, {recursive: true, force: true}));

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

    let theUrl: URL = new URL(url);
    let filePath: string = <string>options.output + ((<string>options.output).endsWith('/') ? '' : '/') + browserName + (options.browserType != null ? '-' + options.browserType : '') + ('/' + options.colorScheme);
    let shortUrl: string = theUrl.protocol == 'data:' ? 'data.html' : (theUrl.protocol == 'file:' ? basename(theUrl.pathname) : theUrl.protocol + '//' + theUrl.host + theUrl.pathname);
    let dimensions: string | string[] | Array<CriticalDimension>;

    if (filePath.slice(-1) != '/') {

        filePath += '/';
    }

    if (theUrl.host !== '') {

        filePath += theUrl.host.replace(':', '@') + '/';
    } else {

        filePath += 'local_files/';
    }

    if (theUrl.pathname != '/') {

        filePath += basename(theUrl.pathname).replace(/\.[a-z]{1,4}$/, '').replace(/^[^a-zA-Z0-9_-]+/, '').replace(/[^a-zA-Z0-9_-]+/, '-');
    } else {

        filePath += 'index'
    }

    // @ts-ignore
    filePath = filePath.replace(/[/]+$/, '');

    await mkdir(dirname(filePath), {recursive: true});

    options.filename = filePath;

    if (options.base != null) {

        if (!options.base.match(/^([a-z]+:\/)?\//)) {

            const parts1: string[] = (filePath.endsWith('/') ? filePath.slice(0, -1) : filePath).split('/');
            const parts2: string[] = (options.base.endsWith('/') ? options.base.slice(0, -1) : options.base).split('/');

            const result: string[] = [];

            parts1.pop();

            while (parts1.shift()) {

                result.push('..');
            }

            result.push(...parts2);

            options.base = result.join('/');
        }
    }

    if ('dimensions' in options) {

        dimensions = <string | string[] | Array<CriticalDimension>>options.dimensions;
    } else {

        dimensions = Number.isInteger(options.width) && Number.isInteger(options.height) ? [{
            width: +<number>options.width,
            height: +<number>options.height
        }] : ['1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'];
    }

    if (dimensions.length == 0) {

        throw new Error(`No dimensions specified`);
    }

    if (typeof dimensions == 'string') {

        dimensions = (<string>dimensions).split(/\s/)
    } else if (!Array.isArray(dimensions)) {

        dimensions = [dimensions];
    }

    dimensions = dimensions.map((dimension: string | CriticalDimension): CriticalDimension => {

        if (typeof dimension == 'string') {

            const parts: string[] = dimension.split(/[xX"']/g);

            return {

                width: +parts[0],
                height: +parts[1]
            }
        }

        return dimension;
    });
    dimensions.sort(() => [-1, 0, 1][Math.floor(3 * Math.random())]);

    // @ts-ignore
    for (const dimension of <CriticalDimension[]>dimensions) {

        if (options.verbose || options.console) {

            console.error(chalk.blue(`[${shortUrl}]> selected browser `) + chalk.green(chromium.name()));
            console.error(chalk.blue(`[${shortUrl}${size}]> set viewport to `) + chalk.green(`${dimension.width}x${dimension.height}`));
        }

        const {browser, context, page} = await createBrowser(options, dimension, chromium, browserName);

        try {

            const size: string = ` (${dimension.width}x${dimension.height})`;

            await context.addInitScript(script + ';window.critical=critical;');
            await page.emulateMedia({
                colorScheme: options.colorScheme,
            });

            if (options.console) {

                page.on('console', (message: ConsoleMessage) =>
                    // @ts-ignore
                    console.error(chalk.yellow(`[${shortUrl}${size}]> ${message.type().replace(/^([a-z])/, (all: string, one: string) => one.toUpperCase())} ${message.text()}`)))
                    // @ts-ignore
                    .on('pageerror', ({message}) => console.error(chalk.red(`[${shortUrl}${size}]> ${message}`)))
                    .on('requestfailed', (request: Request) => {

                        const failure = request.failure();
                        console.error(chalk.red(`[${shortUrl}${size}]> ${failure && failure.errorText} ${request.url()}`))
                    });
            }

            console.error(chalk.blue(`[${shortUrl}${size}]> open `) + url);

            if (options.input != null) {

                const dir: string = await mkdtemp(tmpdir() + '/');

                await writeFile(dir + '/index.html', options.input);
                url = 'file://' + dir + '/index.html';

                // @ts-ignore
                process.on('exit', async () => await rm(dir, {recursive: true}));
                // @ts-ignore
                process.on('uncaughtException', async () => await rm(dir, {recursive: true}));
                // @ts-ignore
                process.on('unhandledRejection', async () => await rm(dir, {recursive: true}));
            }

            await page.goto(url, {waitUntil: 'networkidle'});

            if (options.screenshot) {

                const screenshot: {
                    path: string
                } = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || {path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png'}

                if (dimensions.length > 1) {

                    screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`)
                }

                if (options.verbose) {

                    console.error(chalk.blue(`[${shortUrl}${size}]> generating screenshot at `) + chalk.green(screenshot.path));
                }

                await page.screenshot(screenshot);
            }

            if (options.verbose) {

                console.error(chalk.blue(`[${shortUrl}${size}]> collect critical data`));
            }

            const data = await page.evaluate(async (param: { options: CriticalExtractOptions }) => {

                // @ts-ignore
                return await critical.extract(param.options).then((result: CriticalResult) => {

                    if (Array.isArray(result.fonts)) {

                        // @ts-ignore
                        result.fonts = <string[]>(result.fonts).map((font: FontObject) => JSON.stringify(font));
                    }

                    // @ts-ignore
                    if (param.options.verbose) {

                        console.error(JSON.stringify({result}, null, 1));
                    }

                    return result;
                });
            }, {options});

            if (data.styles != null) {

                data.styles.forEach((line: string) => styles.add(line));
                data.fonts.forEach((line: string) => fonts.add(line));
                stats.push({width: dimension.width, height: dimension.height, stats: data.stats});

                if (options.html != null && html === '') {

                    html = data.html ?? '';
                }
            }

        } catch (error: any) {

            console.error(error);
        } finally {

            await page.close();
            await context.close();
            await browser.close();
        }

        if (<number>options.pause > 0) {

            await sleep(<number>options.pause);
        }
    }

    let htmlFile: string | undefined = undefined;
    let fontJS: string | undefined = undefined;
    let minCssFile: string | undefined = undefined;
    let rawCssFile: string | undefined = undefined;
    let nestedCssFile: string | undefined = undefined;
    let minNestedCssFile: string | undefined = undefined;

    if (options.filename != null) {

        let rawCSS: string = [...styles].join('\n');
        let css: string = rawCSS;

        if (options.advanced) {

            const {browser, context, page} = await createBrowser(options, dimensions[0], chromium, browserName);

            await page.emulateMedia({
                colorScheme: options.colorScheme,
            });

            const dimension = dimensions[0];
            const size: string = ` (${dimension.width}x${dimension.height})`;

            console.error(chalk.blue(`[${shortUrl}${size}]> open `) + url);

            if (options.input != null) {

                const dir: string = await mkdtemp(tmpdir() + '/');

                await writeFile(dir + '/index.html', options.input);
                url = 'file://' + dir + '/index.html';

                // @ts-ignore
                process.on('exit', async () => await rm(dir, {recursive: true}));
                // @ts-ignore
                process.on('uncaughtException', async () => await rm(dir, {recursive: true, force: true}));
                // @ts-ignore
                process.on('unhandledRejection', async () => await rm(dir, {recursive: true, force: true}));
            }

            await page.goto(url, {waitUntil: 'networkidle'});

            const result = await parse(rawCSS, {minify: false}).then(result => Object.assign(result, {ast: expand(result.ast)}));

            for (const {node, parent} of walk(result.ast)) {

                if (node.typ == EnumToken.RuleNodeType) {

                    const filtered = await Promise.all(splitRule((node as AstRule).sel).map(async sel => {

                        const rule: string[] = sel.filter(sel => !sel.match(/::?((before)|(after))/));

                        if (rule.length == 0) {
                            return sel;
                        }

                        // @ts-ignore
                        return await page.evaluate((param: {
                            sel: string;
                            // @ts-ignore
                        }): boolean => document.querySelector(param.sel) != null, {sel: rule.join('')}) ? sel : [];
                    })).then((r: string[][]) => r.filter((r: string[]): boolean => r.length > 0));

                    if (filtered.length == 0) {

                        parent!.chi.splice(parent!.chi.indexOf(node), 1);
                    } else {

                        (node as AstRule).sel = filtered.reduce((acc, curr) => acc + (acc.length == 0 ? '' : ',') + curr.join(''), '');
                    }
                }
            }

            css = render(result.ast, {minify: false, expandNestingRules: true}).code;

            await page.close();
            await context.close();
            await browser.close();
        }

        const {code, unminified}: {
            code: string;
            unminified: string
        } = (await transform(css, {expandNestingRules: true}).then(result => {

            return {code: result.code, unminified: render(result.ast, {minify: false, expandNestingRules: true}).code}
        }));

        const {code: nestedCSS, unminified: nestedUnminified}: {
            code: string;
            unminified: string
        } = (await transform(css, {nestingRules: true}).then(result => {

            return {code: result.code, unminified: render(result.ast, {minify: false}).code}
        }));

        let cssFile: string = options.filename;

        if (cssFile.slice(-4) != '.css') {

            cssFile += '.css';
        }

        minCssFile = cssFile.slice(0, -4) + '.min.css' as string;
        rawCssFile = cssFile.slice(0, -4) + '.raw.css' as string;

        minNestedCssFile = cssFile.slice(0, -4) + '.nested.min.css' as string;
        nestedCssFile = cssFile.slice(0, -4) + '.nested.css' as string;

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

            const match: RegExpMatchArray | null = html.match(/<style data-critical="true">((.|[\r\n])*?)<\/style>/);

            if (match) {

                html = html.replace(match[0], `<style data-critical="true">${css}</style>`);
            }

            htmlFile = options.filename + '.html';
            // @ts-ignore
            await writeFile(htmlFile, html);
        }
    }

    const fontObjects: Set<FontObject> = <Set<FontObject>>new Set([...fonts].map((font: string) => JSON.parse(font)));

    if (options.fonts) {

        let fontJS: string = options.filename;
        let data: string = '/* no font found! */';

        if (fontJS.slice(-3) != '.js') {

            fontJS += '.js';
        }

        if (fontObjects.size == 0) {

            console.error(chalk.yellow(`[${shortUrl}]> no preload font found`));
        } else {

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

/**
 *
 * test whitespace codepoints
 */
export function isWhiteSpace(codepoint: number): boolean {

    return codepoint == 0x9 || codepoint == 0x20 ||
        // isNewLine
        codepoint == 0xa || codepoint == 0xc || codepoint == 0xd;
}

/**
 *
 * split css rule
 */
export function splitRule(buffer: string): string[][] {

    const result: string[][] = [[]];
    let str: string = '';

    for (let i = 0; i < buffer.length; i++) {

        let chr: string = buffer.charAt(i);

        if (isWhiteSpace(chr.charCodeAt(0))) {

            let k: number = i;

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
                } else if (chr == close) {
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
