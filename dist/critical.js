(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('playwright'), require('path'), require('fs'), require('colors')) :
    typeof define === 'function' && define.amd ? define(['exports', 'playwright', 'path', 'fs', 'colors'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.critical = {}, global.playwright, global.path, global.fs));
})(this, (function (exports, playwright, path, fs) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var playwright__namespace = /*#__PURE__*/_interopNamespace(playwright);

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
    async function critical(url, options = {}) {

        const styles = new Set;
        const stats = [];
        let html = '';
        let fonts = new Set;
        const chromium = (['chromium', 'firefox', 'webkit', 'edge', 'chrome'].includes(options.browser) && playwright__namespace[options.browser]) || playwright__namespace.chromium;

        if (['"', "'"].includes(url.charAt(0))) {

            url = url.replace(/^(['"])([^\1\s]+)\1$/, '$2');
        }

        if(!url.match(/^([a-zA-Z]+:)?\/\//)) {

            url = 'file://' + (url.charAt(0) == '/' ? url : path.resolve(__dirname + '/' + url));
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
            output: 'output/'
        }, options);

        let theUrl = new URL(url);
        let filePath = options.output;
        let shortUrl = (theUrl.protocol == 'file:' ? path.basename(theUrl.pathname) : theUrl.protocol + '//' + theUrl.host + theUrl.pathname);
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

        if ('dimensions' in options) {

            dimensions = options.dimensions;
        }

        else {

            dimensions = !isNaN(options.width) && !isNaN(options.height) ? [{width: options.width, height: +options.height}] : ['1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'];
        }


        if (typeof dimensions == 'string') {

            dimensions = dimensions.split(/\s/);
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

        const script = fs.readFileSync(path.dirname(__filename) + '/browser.js').toString();
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

            console.info(`[${shortUrl}]> selected browser `.blue + chromium.name().green);
            console.info(`[${shortUrl}]> set viewport to `.blue + `${dimension.width}x${dimension.height}`.green);

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
                    console.log(`[${shortUrl}]> ${message.type().replace(/^([a-z])/, (all, one) => one.toUpperCase())} ${message.text()}`.yellow))
                    .on('pageerror', ({message}) => console.log(`[${shortUrl}]> ${message}.red`))
                    .on('requestfailed', request => {

                        const failure = request.failure();
                        console.log(`[${shortUrl}]> ${failure && failure.errorText} ${request.url()}`.red);
                    });
            }

            console.info(`[${shortUrl}]> open `.blue + url);

            await page.goto(url, {waitUntil: 'networkidle', timeout: 0});

            if (options.screenshot) {

                const screenshot = typeof options.screenshot == 'object' && Object.assign({}, options.screenshot) || {path: typeof options.screenshot == 'string' && options.screenshot || options.filename + '.png' || 'screenshot.png'};

                if (dimensions.length > 1) {

                    screenshot.path = screenshot.path.replace(/\.([^.]+)$/, `_${dimension.width}x${dimension.height}.\$1`);
                }

                console.info(`[${shortUrl}]>  generating screenshot at `.blue + screenshot.path.green);
                await page.screenshot(screenshot);
            }

            // await page.addScriptTag({url: script});
            console.info(`[${shortUrl}]> collect critical data`.blue);
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

            console.info(`[${shortUrl}]> writing css at `.blue + cssFile.green + ' ['.green + size(output.length).green + ']'.green);
            fs.writeFile(cssFile, output, function (error, data) {

                if (error) {

                    console.error({error});
                }
            });
        }

        if (options.html && html !== '') {

            const match = html.match(/<style data-critical="true">((.|[\r\n])*?)<\/style>/);

            if (match) {

                html = html.replace(match[0], `<style data-critical="true">${[...styles].join('\n')}</style>`);
            }

            fs.writeFile(`${options.filename}.html`, html, function (error, data) {

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

        return {styles: [...styles], fonts: [...fonts], stats, html};
    }

    exports.critical = critical;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
