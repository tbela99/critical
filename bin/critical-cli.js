#!/usr/bin/env node
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {critical} from '../dist/index.js';

const _yargs = yargs(hideBin(process.argv)).command('url [url+] [options+]\nrun the command line tools', 'Example: critical-cli -d 800x600 -d 1024x768 -i https://facebook.com').
option('headless', {
    alias: 't',
    description: 'enable or disable headless mode',
    type: 'boolean',
    defaultDescription: "true"
}).option('browser', {
    alias: 'b',
    default: 'chromium',
    description: 'browser to use',
    choices: ['chromium', 'firefox', 'webkit', 'edge', 'chrome'],
    defaultDescription: "chromium",
    type: 'string'
}).option('random-user-agent', {
    alias: 'r',
    description: 'generate random user and prevent browser automation detection',
    type: 'boolean'
}).option('fonts', {
    alias: 'f',
    description: 'Generate javascript to load fonts dynamically',
    type: 'boolean',
    defaultDescription: "true"
}).option('screenshot', {
    alias: 'i',
    description: 'Generate screenshots',
    type: 'boolean'
}).option('console', {
    alias: 'l',
    description: 'Show console messages from the browser',
    type: 'boolean',
    defaultDescription: "true"
}).option('secure', {
    alias: 's',
    description: 'enable or disable security settings such as CSP and same origin policy',
    type: 'boolean'
}).option('filename', {
    alias: 'n',
    description: 'prefix of the generated files',
    type: 'string'
}).option('width', {
    alias: 'w',
    description: 'Viewport width',
    type: 'number'
}).option('height', {
    alias: 'a',
    description: 'Viewport height',
    type: 'number'
}).option('dimensions', {
    alias: 'd',
    type: 'array',
    description: 'Array of viewports, override height/width settings',
    defaultDescription: "'1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'"
}).option('container', {
    alias: 'c',
    description: 'Disable additional security settings to run inside a container',
    type: 'boolean',
}).option('html', {
    alias: 'p',
    description: 'generate an HTML page containing inlined critical css',
    type: 'boolean',
}).option('output', {
    alias: 'o',
    description: 'Output directory',
    type: 'string'
}).
positional('url', {
    describe: 'list of urls',
    type: 'string'
}).help().
alias('help', 'h');

const options = _yargs.argv;
const urls = options._;

for (let key of Object.keys(options)) {

    if (key.length === 1 && key !== '_') {

        // @ts-ignore
        delete options[key];
    }
}

delete options._;
delete options.$0;

if (urls.length === 0) {

    _yargs.showHelp();
    process.exit();
}

options.container = true;

for (let url of urls) {

    critical(url, options).catch(error => console.error(error));
}
