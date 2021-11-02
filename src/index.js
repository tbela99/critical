import puppeteer from "puppeteer/lib/cjs/puppeteer/node-puppeteer-core";
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

    const styles = new Set;
    const stats = [];
    const html = [];
    let fonts = new Set;

    if (['"', "'"].includes(url.charAt(0))) {

        url = url.replace(/^(['"])([^\1\s]+)\1$/, '$2');
    }

    if(!url.match(/^([a-zA-Z]+:)?\/\//)) {

        url = 'file://' + (url.charAt(0) == '/' ? url : resolve(__dirname + '/' + url));
    }

    options = Object.assign({

        fonts: false,
        headless: true,
        screenshot: false,
        console: true,
        secure: false,
        filename: '',
        width: 800,
        height: 600,
        container: false,
        html: false,
        output: 'output/'
    }, options);
    basename(options.filename);

    let theUrl = new URL(url);
    let filePath = options.output;
    let shortUrl = (theUrl.protocol == 'file:' ? basename(theUrl.pathname) : theUrl.protocol + '//' + theUrl.host + theUrl.pathname);

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

            console.error({error});
        }
    });

    options.filename = filePath;

    let dimensions = 'dimensions' in options ? options.dimensions : {
        width: options.width || 800,
        height: options.height || 600
    };

    if (!Array.isArray(dimensions)) {

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
        defaultViewport: {
            isMobile: true,
            isLandscape: false,
        },
        waitForInitialPage: false,
        args: [],
        ignoreDefaultArgs: ['--enable-automation']
    };

    const executablePath = process.env.CHROMIUM_PATH;

    if (executablePath) {

        launchOptions.executablePath = executablePath
    }

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

        console.info(`[${shortUrl}]> selected browser `.blue + puppeteer.product.green);
        console.info(`[${shortUrl}]> set viewport to `.blue + `${dimension.width}x${dimension.height}`.green);

        const browser = await puppeteer.launch(launchOptions);

        const pages = await browser.pages();
        if (pages.length === 0) pages.push(await browser.newPage());

        const page = pages[0];

        if (!options.secure) {

            await page.setBypassCSP(true);
        }

        if (options.console) {

            page.on('console', message =>
                console.log(`[${shortUrl}]> ${message.type().replace(/^([a-z])/, (all, one) => one.toUpperCase())} ${message.text()}`.yellow))
                .on('pageerror', ({message}) => console.log(`[${shortUrl}]> ${message}.red`))
                .on('requestfailed', request => {

                    const failure = request.failure()
                    console.log(`[${shortUrl}]> ${failure && failure.errorText} ${request.url()}`.red)
                });
        }

        console.info(`[${shortUrl}]> open `.blue + url);

        await page.goto(url, {waitUntil: 'networkidle2', timeout: 0});

        if (options.screenshot) {

            const screenshot = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || {path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png'}

            if (dimensions.length > 1) {

                screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`)
            }

            console.info(`[${shortUrl}]>  generating screenshot at `.blue + screenshot.path.green)
            await page.screenshot(screenshot)
        }

        // await page.addScriptTag({url: script});
        console.info(`[${shortUrl}]> collect critical data`.blue);
        const data = await page.evaluate((options, script) => {

            const sc = document.createElement('script');

            sc.textContent = script;
            document.body.append(sc);

            return critical.extract(options).then(result => {

                result.fonts = result.fonts.map(font => JSON.stringify(font));
                return result;
            })
        }, options,script);

        data.styles.forEach(line => styles.add(line));
        data.fonts.forEach(line => fonts.add(line));
        stats.push({width: dimension.width, height: dimension.height, stats: data.stats});

        if (options.html) {

            html.push({width: dimension.width, height: dimension.height, html: data.html});
            writeFile(`${options.filename}_${dimension.width}x${dimension.height}.html`, data.html, function (error, data) {

                if (error) {

                    console.error({error});
                }
            });
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

        console.info(`[${shortUrl}]> writing css at `.blue + cssFile.green + ' ['.green + size(output.length).green + ']'.green);
        writeFile(cssFile, output, function (error, data) {

            if (error) {

                console.error({error});
            }
        });
    }

    fonts = new Set([...fonts].map(font => JSON.parse(font)));

    if (options.fonts) {

        let fontJS = options.filename;
        let data = '/* no font found! */';

        if (fontJS.substr(-3) != '.js') {

            fontJS += '.js';
        }

        if (fonts.size == 0) {

            console.info(`[${shortUrl}]> no preload font found`.yellow)
        } else {

            data = fontscript([...fonts]);
            console.info(`[${shortUrl}]> writing `.blue + fonts.size.toString().green + ` preload font script at `.blue + `${fontJS} [`.green + size(data.length).green + ']'.green);
        }

        writeFile(fontJS, data, function (error, data) {

            if (error) {

                console.error({error});
            }
        });
    }

    return {styles: [...styles], fonts: [...fonts], stats, html};
}
