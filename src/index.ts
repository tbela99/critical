import * as playwright from "playwright";
import {devices} from "playwright";
import {resolve, dirname, basename} from "path";
import {mkdir, readFileSync, writeFile} from "fs";
import {fontscript} from "./critical/fontscript.js";
import {size} from "./file/size.js";
import {
    BrowserOptions,
    CriticalCliResult, CriticalCliStats,
    CriticalDimension,
    CriticalExtractOptions,
    CriticalOptions,
    CriticalResult,
    FontObject
} from "./@types";
import {Request, ConsoleMessage, BrowserType, Browser, BrowserContext, LaunchOptions, Page} from "playwright";
import chalk from "chalk";
import {render, transform} from "@tbela99/css-parser";
import {createRequire} from 'node:module';

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

async function sleep(duration: number) {

    return new Promise(resolve => setTimeout(resolve, duration + Math.ceil(Math.random() * 10)));
}

export async function critical(url: string, options: CriticalOptions = {}): Promise<CriticalCliResult> {


    let html: string = '';
    let fonts: Set<string> = new Set<string>;

    const styles: Set<string> = new Set<string>;
    const stats: CriticalCliStats[] = [];
    const browserName: BrowserOptions = <BrowserOptions>(options.randomBrowser ? ['chromium', 'firefox', 'webkit', 'edge', 'chrome'][Math.floor(Math.random() * 5)] : options.browser ?? 'chromium');
    const chromium: BrowserType = <BrowserType>(['chromium', 'firefox', 'webkit', 'edge', 'chrome'].includes(browserName) &&
        // @ts-ignore
        playwright[browserName]) ?? <string>playwright.chromium ?? 'chromium';

    if (['"', "'"].includes(url.charAt(0))) {

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
    let shortUrl: string = (theUrl.protocol == 'file:' ? basename(theUrl.pathname) : theUrl.protocol + '//' + theUrl.host + theUrl.pathname);
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

    mkdir(dirname(filePath), {recursive: true}, function (error) {

        if (error) {

            console.error({error});
        }
    });

    options.filename = filePath;

    if ('dimensions' in options) {

        dimensions = <string | string[] | Array<CriticalDimension>>options.dimensions;
    } else {

        dimensions = Number.isInteger(options.width) && Number.isInteger(options.height) ? [{
            width: +<number>options.width,
            height: +<number>options.height
        }] : ['1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'];
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

        const size: string = ` (${dimension.width}x${dimension.height})`

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

        if (options.verbose || options.console) {

            console.info(chalk.blue(`[${shortUrl}]> selected browser `) + chalk.green(chromium.name()));
            console.info(chalk.blue(`[${shortUrl}${size}]> set viewport to `) + chalk.green(`${dimension.width}x${dimension.height}`));
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
        // @ts-ignore
        const context: BrowserContext = <BrowserContext>await browser.newContext({
            // @ts-ignore
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

        await context.addInitScript(script);
        // await context.addInitScript(minify);

        const page: Page = await context.newPage();

        await page.emulateMedia({
            colorScheme: options.colorScheme,
        });

        if (options.console) {

            page.on('console', (message: ConsoleMessage) =>
                // @ts-ignore
                console.log(chalk.yellow(`[${shortUrl}${size}]> ${message.type().replace(/^([a-z])/, (all: string, one: string) => one.toUpperCase())} ${message.text()}`)))
                // @ts-ignore
                .on('pageerror', ({message}) => console.log(chalk.red(`[${shortUrl}${size}]> ${message}`)))
                .on('requestfailed', (request: Request) => {

                    const failure = request.failure();
                    console.log(chalk.red(`[${shortUrl}${size}]> ${failure && failure.errorText} ${request.url()}`))
                });
        }

        console.info(chalk.blue(`[${shortUrl}${size}]> open `) + url);

        await page.goto(url, {waitUntil: 'networkidle'});

        if (options.screenshot) {

            const screenshot: {
                path: string
            } = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || {path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png'}

            if (dimensions.length > 1) {

                screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`)
            }

            if (options.verbose) {

                console.info(chalk.blue(`[${shortUrl}${size}]> generating screenshot at `) + chalk.green(screenshot.path));
            }

            await page.screenshot(screenshot);
        }

        if (options.verbose) {

            console.info(chalk.blue(`[${shortUrl}${size}]> collect critical data`));
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

                    console.log(JSON.stringify({result}, null, 1));
                }

                return result;
            });
        }, {options, shortUrl, size});

        if (data.styles != null) {

            data.styles.forEach((line: string) => styles.add(line));
            data.fonts.forEach((line: string) => fonts.add(line));
            stats.push({width: dimension.width, height: dimension.height, stats: data.stats});

            if (options.html != null && html === '') {

                html = data.html ?? '';
            }
        }

        await page.close();
        await browser.close();

        if (<number>options.pause > 0) {

            await sleep(<number>options.pause);
        }
    }

    if (options.filename) {

        const rawCSS: string = [...styles].join('\n');
        const {code, unminified}: { code: string; unminified: string } = (await transform(rawCSS).then(result => {

            return {code: result.code, unminified: render(result.ast, {minify: false}).code}
        }));
        const {code: nestedCSS, unminified: nestedUnminified}: { code: string; unminified: string } = (await transform(rawCSS, {nestingRules: true}).then(result => {

            return {code: result.code, unminified: render(result.ast, {minify: false}).code}
        }));

        let cssFile: string = options.filename;

        if (cssFile.slice(-4) != '.css') {

            cssFile += '.css';
        }

        const minCssFile: string = cssFile.slice(0, -4) + '.min.css';
        const rawCssFile: string = cssFile.slice(0, -4) + '.raw.css';

        const minNestedCssFile: string = cssFile.slice(0, -4) + '.nested.min.css';
        const nestedCssFile: string = cssFile.slice(0, -4) + '.nested.css';

        console.info(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(minCssFile + ' [' + size(code.length) + ']'));
        // @ts-ignore
        writeFile(minCssFile, code, function (error: Error | null) {

            if (error) {

                console.error(error);
            }
        });

        console.info(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(cssFile + ' [' + size(unminified.length) + ']'));

        writeFile(cssFile, unminified, function (error: Error | null) {

            if (error) {

                console.error({error});
            }
        });

        // @ts-ignore
        writeFile(rawCssFile, rawCSS, function (error: Error | null) {

            if (error) {

                console.error({error});
            }
        });

        console.info(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(minNestedCssFile + ' [' + size(nestedCSS.length) + ']'));
        // @ts-ignore
        writeFile(minNestedCssFile, nestedCSS, function (error: Error | null) {

            if (error) {

                console.error({error});
            }
        });

        console.info(chalk.blue(`[${shortUrl}]> writing css at `) + chalk.green(nestedCssFile + ' [' + size(nestedUnminified.length) + ']'));

        writeFile(nestedCssFile, nestedUnminified, function (error: Error | null) {

            if (error) {

                console.error({error});
            }
        });

        // @ts-ignore
        writeFile(rawCssFile, rawCSS, function (error: Error | null) {

            if (error) {

                console.error({error});
            }
        });
    }

    if (options.html != null && html != null && html !== '') {

        const match: RegExpMatchArray | null = html.match(/<style data-critical="true">((.|[\r\n])*?)<\/style>/);

        if (match) {

            html = html.replace(match[0], `<style data-critical="true">${[...styles].join('\n')}</style>`);
        }

        // @ts-ignore
        writeFile(`${options.filename}.html`, html, function (error: Error) {

            if (error) {

                console.error({error});
            }
        });
    }

    const fontObjects: Set<FontObject> = <Set<FontObject>>new Set([...fonts].map((font: string) => JSON.parse(font)));

    if (options.fonts) {

        let fontJS: string = options.filename;
        let data: string = '/* no font found! */';

        if (fontJS.slice(-3) != '.js') {

            fontJS += '.js';
        }

        if (fontObjects.size == 0) {

            console.info(chalk.yellow(`[${shortUrl}]> no preload font found`));
        } else {

            data = fontscript([...fontObjects]);
            console.info(chalk.blue(`[${shortUrl}]> writing `) + chalk.green(fontObjects.size.toString()) + chalk.blue(` preload font script at `) +
                chalk.green(`${fontJS} [` + size(data.length) + ']'));
        }

        // @ts-ignore
        writeFile(fontJS, data, function (error) {

            if (error) {

                console.error({error});
            }
        });
    }

    return {styles: [...styles], fonts: [...fonts], stats, html};
}
