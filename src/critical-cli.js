const critical = require(__dirname + '/../dist/critical');
const yargs = require('yargs');
const {hideBin} = require('yargs/helpers');
const colors = require('colors');

const _yargs = yargs(hideBin(process.argv)).command('url [url+] [options+]\nrun the command line tools', 'Example: critical-cli -d 800x600 -d 1024x768 -i https://facebook.com').option('headless', {
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
}).option('screenshot', {
    alias: 'i',
    description: 'Generate screenshots',
    type: 'boolean'
}).option('secure', {
    alias: 's',
    description: 'enable or disable security settings such as CSP and same origin policy',
    type: 'boolean'
}).option('output', {
    alias: 'o',
    description: 'Output directory',
    type: 'string'
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
    // default: ['1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'],
    defaultDescription: "'1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'"
}).option('fonts', {
    alias: 'f',
    description: 'Generate javascript to load fonts dynamically',
    type: 'boolean',
    defaultDescription: "true"
}).option('console', {
    alias: 'l',
    description: 'Show console messages from the browser',
    type: 'boolean',
    defaultDescription: "true"
}).option('container', {
    alias: 'c',
    description: 'Disable additional security settings to run inside a container',
    type: 'boolean',
}).option('html', {
    alias: 'p',
    description: 'Generate an HTML page containing inlined critical css',
    type: 'boolean',
}).option('verbose', {
    alias: 'v',
    description: 'Enable verbose mode',
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
    process.exit()
}

options.container = true;

for (let url of urls) {

    critical.critical(url, options).catch(((url) => {

        return (error) => {

            process.stderr.write(error);
        }
    })(url));
}
