import * as playwright from "playwright";
import {resolve, dirname, basename} from "path";
import {mkdir, readFileSync, writeFile} from "fs";
import {colors} from "colors";
import {fontscript} from "./critical/fontscript";
import {size} from "./file/size";

/**
 *
 * @param {string} url
 * @param {object} options?
 * - fonts: true
 * - headless: true
 * - console: true
 * - screenshot: false
 * - secure: false
 * - filename: ''
 * - width: 800
 * - height: 600
 * - dimensions: []|string
 * - container: false
 * - html: false
 * - output: 'output/'
 *
 * @returns {Promise<{styles: string[], fonts: object[], stats: object, html: string?}>}
 */
export async function critical(url, options = {}) {

    const logger = new console.Console({ stdout: process.stderr, stderr: process.stderr });
    const styles = new Set;
    const stats = [];
    let html = '';
    let fonts = new Set;
    const chromium = (['chromium', 'firefox', 'webkit', 'edge', 'chrome'].includes(options.browser) && playwright[options.browser]) || playwright.chromium;

    if (['"', "'"].includes(url.charAt(0))) {

        url = url.replace(/^(['"])([^\1\s]+)\1$/, '$2');
    }

    if(!url.match(/^([a-zA-Z]+:)?\/\//)) {

        url = 'file://' + (url.charAt(0) == '/' ? url : resolve(__dirname + '/' + url));
    }

    options = Object.assign({

        fonts: true,
        headless: true,
        screenshot: false,
        console: true,
        secure: false,
        filename: '',
        container: false,
        html: false,
        verbose: false,
        output: 'output/'
    }, options);

    let theUrl = new URL(url);
    let filePath = options.output;
    let shortUrl = (theUrl.protocol == 'file:' ? basename(theUrl.pathname) : theUrl.protocol + '//' + theUrl.host + theUrl.pathname);
    let dimensions;

    if (filePath.substr(-1) != '/') {

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
    } else {

        filePath += 'index'
    }

    filePath = filePath.replace(/[/]+$/, '');

    mkdir(dirname(filePath), {recursive: true}, function (error, state) {

        if (error) {

            logger.error({error});
        }
    });

    options.filename = filePath;

    if ('dimensions' in options) {

        dimensions = options.dimensions;
    }

    else {

        dimensions = !isNaN(options.width) && !isNaN(options.height) ? [{width: options.width, height: +options.height}] : ['1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'];
    }


    if (typeof dimensions == 'string') {

        dimensions = dimensions.split(/\s/g)
    }
    else if (!Array.isArray(dimensions)) {

        dimensions = [dimensions];
    }

    dimensions = dimensions.map(dimension => {

        if (typeof dimension == 'string') {

            const parts = dimension.split(/[xX"']/g);

            return {

                width: +parts[0],
                height: +parts[1]
            }
        }

        return dimension;
    });

    dimensions.sort(function (a, b) {

        return a.width - b.width;
    });

    if (typeof btoa == 'undefined') {

        var btoa = function (string) {

            return Buffer.from(string, 'binary').toString('base64')
        }
    }

    const script = readFileSync(dirname(__filename) + '/browser.js').toString();
    // const script = 'data:text/javascript;base64, ' + btoa(readFileSync(dirname(__filename) + '/browser.js').toString());
    // const script = 'file://' + resolve(__dirname + '/browser.js');
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

    // const executablePath = process.env.CHROMIUM_PATH;
    //
    // if (executablePath) {
    //
    //     launchOptions.executablePath = executablePath
    // }

    for (let dimension of dimensions) {

        Object.assign(launchOptions.defaultViewport, dimension);

        launchOptions.args = [
            '--test-type',
            '--no-startup-window',
            `--window-size=${dimension.width},${dimension.height}`
        ];

        if (!options.secure) {

            launchOptions.args.push(
                '--disable-web-security',
                '--no-default-browser-check',
                '--ignore-certificate-errors'
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

        if (options.verbose) {

            logger.info(`[${shortUrl}]> selected browser `.blue + chromium.name().green);
            logger.info(`[${shortUrl}]> set viewport to `.blue + `${dimension.width}x${dimension.height}`.green);
        }

        const browser = await chromium.launch(launchOptions);

        // const pages = browser.pages();
        // if (pages.length === 0) pages.push(await browser.newPage());
        //
        // const page = pages[0];
        const context = await browser.newContext({
            bypassCSP: !options.secure,
            viewport: dimension
        });
        const page = await context.newPage();

        if (options.console) {

            page.on('console', message =>
                logger.log(`[${shortUrl}]> ${message.type().replace(/^([a-z])/, (all, one) => one.toUpperCase())} ${message.text()}`.yellow))
                .on('pageerror', ({message}) => logger.log(`[${shortUrl}]> ${message}.red`))
                .on('requestfailed', request => {

                    const failure = request.failure()
                    logger.log(`[${shortUrl}]> ${failure && failure.errorText} ${request.url()}`.red)
                });
        }

        if (options.verbose) {

            logger.info(`[${shortUrl}]> open `.blue + url);
        }

        await page.goto(url, {waitUntil: 'networkidle', timeout: 0});

        if (options.screenshot) {

            const screenshot = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || {path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png'}

            if (dimensions.length > 1) {

                screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`)
            }

            if (options.verbose) {

                logger.info(`[${shortUrl}]>  generating screenshot at `.blue + screenshot.path.green)
            }

            await page.screenshot(screenshot)
        }

        // await page.addScriptTag({url: script});

        if (options.verbose) {

            logger.info(`[${shortUrl}]> collect critical data`.blue);
        }

        const data = await page.evaluate(param => {

            const sc = document.createElement('script');

            sc.textContent = param.script;
            document.body.append(sc);
            sc.remove();

            return critical.extract(param.options).then(result => {

                result.fonts = result.fonts.map(font => JSON.stringify(font));
                return result;
            })
        }, {options, script});

        data.styles.forEach(line => styles.add(line));
        data.fonts.forEach(line => fonts.add(line));
        stats.push({width: dimension.width, height: dimension.height, stats: data.stats});

        if (options.html && html === '') {

            html = data.html;
        }

        await page.close();
        await browser.close();
    }

    if (options.filename) {

        const output = [...styles].join('\n');
        let cssFile = options.filename;

        if (cssFile.substr(-4) != '.css') {

            cssFile += '.css';
        }


        if (options.verbose) {

            logger.info(`[${shortUrl}]> writing css at `.blue + cssFile.green + ' ['.green + size(output.length).green + ']'.green);
        }

        writeFile(cssFile, output, function (error, data) {

            if (error) {

                logger.error({error});
            }
        });
    }

    if (options.html && html !== '') {

        const match = html.match(/<style data-critical="true">((.|[\r\n])*?)<\/style>/);

        if (match) {

            html = html.replace(match[0], `<style data-critical="true">${[...styles].join('\n')}</style>`);
        }

        writeFile(`${options.filename}.html`, html, function (error, data) {

            if (error) {

                logger.error({error});
            }
        });
    }

    if (options.fonts) {

        fonts = new Set([...fonts].map(font => JSON.parse(font)));

        let fontJS = options.filename;
        let data = '/* no font found! */';

        if (fontJS.substr(-3) != '.js') {

            fontJS += '.js';
        }

        if (fonts.size == 0) {

            if (options.verbose) {

                logger.info(`[${shortUrl}]> no preload font found`.yellow)
            }
        } else {

            data = fontscript([...fonts]);

            if (options.verbose) {

                logger.info(`[${shortUrl}]> writing `.blue + fonts.size.toString().green + ` preload font script at `.blue + `${fontJS} [`.green + size(data.length).green + ']'.green);
            }
        }

        writeFile(fontJS, data, function (error, data) {

            if (error) {

                logger.error({error});
            }
        });
    }

    return {styles: [...styles], fonts: [...fonts], stats, html};
}
