(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('puppeteer/lib/cjs/puppeteer/node-puppeteer-core'), require('path'), require('fs'), require('colors')) :
    typeof define === 'function' && define.amd ? define(['exports', 'puppeteer/lib/cjs/puppeteer/node-puppeteer-core', 'path', 'fs', 'colors'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.critical = {}, global.puppeteer, global.path, global.fs));
}(this, (function (exports, puppeteer, path, fs) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var puppeteer__default = /*#__PURE__*/_interopDefaultLegacy(puppeteer);

    /**
     *
     * @param {string[]} fonts
     */
    function fontscript(fonts) {

        return '/* font preloader script: ' + fonts.length + ' */\n"fonts" in document && ' + JSON.stringify([...fonts], null, 1) + '.forEach(font => new FontFace(font.fontFamily, font.src, font.properties).load().then(font => document.fonts.add(font)))'
    }

    /**
     *
     * @param {int} number
     * @param {string[]} units
     * @return {string}
     */
    function size (number, units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']) {

        if(number == 0) return '0';

        const e = Math.floor(Math.log(number) / Math.log(1024));

        return (number / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + units[e];
    }

    /**
     *
     * @param {string} url
     * @param {object} options?
     * - fonts:
     * - headless:
     * - screenshot: false,
     * - secure: false,
     * - filename: '',
     * - width: 800,
     * - height: 600,
     * - dimensions: []|string
     * - container: false
     * - output: 'output/'
     *
     * @returns {Promise<{fonts: string[], styles: object[]}>}
     */
    async function critical(url, options = {}) {

        const styles = new Set;
        let fonts = new Set;

        if (['"', "'"].includes(url.charAt(0))) {

            url = url.replace(/^(['"])([^\1\s]+)\1$/, '$2');
        }

        options = Object.assign({

            fonts: true,
            headless: true,
            screenshot: false,
            secure: false,
            filename: '',
            width: 800,
            height: 600,
            container: false,
            output: 'output/'
        }, options);

        let filename = path.basename(options.filename);
        let theUrl = new URL(filename === '' ? url : filename, url);
        let filePath = options.output;
        let shortUrl = theUrl.protocol + '//' + theUrl.host + theUrl.pathname;

        if (filePath.substr(-1) != '/') {

            filePath += '/';
        }

        if (theUrl.host !== '') {

            filePath += theUrl.host.replace(':', '@') + '/';
        }

        if (theUrl.pathname != '/') {

            filePath += path.basename(theUrl.pathname).replace(/\.[a-z]{1,4}$/, '').replace(/^[^a-zA-Z0-9_-]+/, '').replace(/[^a-zA-Z0-9_-]+/, '-');
        } else {

            filePath += 'index';
        }

        filePath = filePath.replace(/[/]+$/, '');
        fs.mkdir(path.dirname(filePath), {recursive: true}, function (error, state) {

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

        if (!/^(https?:)\/\//.test(url)) {

            url = 'file://' + path.resolve(url);
        }

        if (typeof btoa == 'undefined') {

            var btoa = function (string) {

                return Buffer.from(string, 'binary').toString('base64')
            };
        }

        const script = 'data:text/javascript;base64, ' + btoa(fs.readFileSync(path.dirname(__filename) + '/browser.js').toString());
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

            launchOptions.executablePath = executablePath;
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
                );
            }

            if (options.container) {

                launchOptions.args.push(
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--disable-setuid-sandbox",
                    "--no-sandbox"
                );
            }

            console.info(`[${shortUrl}]> selected browser `.blue + puppeteer__default['default'].product.green);
            console.info(`[${shortUrl}]> set viewport to `.blue + `${dimension.width}x${dimension.height}`.green);

            const browser = await puppeteer__default['default'].launch(launchOptions);

            const pages = await browser.pages();
            if (pages.length === 0) pages.push(await browser.newPage());

            const page = pages[0];

            if (!options.secure) {

                await page.setBypassCSP(true);
            }

            if (options.console) {

                page.on('console', message =>
                    console.log(`[${shortUrl}]> ${message.type().substr(0, 3).replace(/^([a-z])/, (all, one) => one.toUpperCase())} ${message.text()}`.yellow))
                    .on('pageerror', ({message}) => console.log(`[${shortUrl}]> ${message}.red`))
                    // .on('response', response =>
                    //     console.log(`${response.status()} ${response.url()}`))
                    .on('requestfailed', request => {

                        const failure = request.failure();
                        console.log(`[${shortUrl}]> ${failure && failure.errorText} ${request.url()}`.red);
                    });
            }

            console.info(`[${shortUrl}]> open `.blue + url);
            await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
            await page.addScriptTag({url: script});

            console.info(`[${shortUrl}]> collect critical data`.blue);
            const data = await page.evaluate(() => {

                return critical.extract().then(result => {

                    result.fonts = result.fonts.map(font => JSON.stringify(font));
                    return result;
                })
            });

            data.styles.forEach(line => styles.add(line));
            data.fonts.forEach(line => fonts.add(line));

            if (options.screenshot) {

                const screenshot = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || {path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png'};

                if (dimensions.length > 1) {

                    screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`);
                }

                console.info(`[${shortUrl}]>  generating screenshot at `.blue + screenshot.path.green);
                await page.screenshot(screenshot);
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
            fs.writeFile(cssFile, output, function (error, data) {

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

                console.info(`[${shortUrl}]> no preload font found`.yellow);
            } else {

                data = fontscript([...fonts]);
                console.info(`[${shortUrl}]> writing `.blue + fonts.size.toString().green + ` preload font script at `.blue + `${fontJS} [`.green + size(data.length).green + ']'.green);
            }

            fs.writeFile(fontJS, data, function (error, data) {

                if (error) {

                    console.error({error});
                }
            });
        }

        return {styles: [...styles], fonts: [...fonts]};
    }

    exports.critical = critical;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
