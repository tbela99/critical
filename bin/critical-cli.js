(function () {
    'use strict';

    const critical = require(__dirname + '/../dist/critical');
    const yargs = require('yargs');
    const {hideBin} = require('yargs/helpers');
    require('colors');

    const _yargs = yargs(hideBin(process.argv)).command('url [url+] [options+]\nrun the command line tools', 'Example: node critical-cli.js -d 800x600 -d 1024x768 -i https://facebook.com').option('headless', {
        alias: 't',
        description: 'enable or disable headless mode',
        type: 'boolean',
    }).option('screenshot', {
        alias: 'i',
        description: 'Generate screenshots',
        type: 'boolean',
    }).option('secure', {
        alias: 's',
        description: 'enable or disable security settings such as CSP and same origin policy',
        type: 'boolean',
    }).option('output', {
        alias: 'o',
        description: 'Output directory',
        type: 'string',
    }).option('filename', {
        alias: 'n',
        description: 'prefix of the generated files',
        type: 'string',
    }).option('width', {
        alias: 'w',
        description: 'Viewport width',
        type: 'number',
    }).option('height', {
        alias: 'a',
        description: 'Viewport height',
        type: 'number',
    }).option('dimensions', {
        alias: 'd',
        description: 'Array of viewports, override height/width settings',
        type: 'array',
    }).option('fonts', {
        alias: 'f',
        description: 'Generate javascript to load fonts dynamically',
        type: 'boolean',
    }).option('console', {
        alias: 'l',
        description: 'Log console errors from the page',
        type: 'boolean',
    }).option('container', {
        alias: 'c',
        description: 'Disable additional settings to run inside a container',
        type: 'boolean',
    }).option('html', {
        alias: 'p',
        description: 'generate an HTML page containing inlined critical css',
        type: 'boolean',
    }).help().alias('help', 'h');

    const options = _yargs.argv;

    const urls = options._;

    for (let key of Object.keys(options)) {

        if (key.length == 1 && key != '_') {

            delete options[key];
        }
    }

    delete options._;
    delete options.$0;

    if (urls.length == 0) {

        _yargs.showHelp();
        process.exit();
    }

    options.container = true;

    for (let url of urls) {

        critical.critical(url, options).catch(((url) => {

            return (error) => {

                console.error(`failed to process ${url}`);
                console.error(JSON.stringify(error, null, 1));
            }
        })(url));
    }

}());
