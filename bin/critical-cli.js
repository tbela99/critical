#!/usr/bin/env node
const critical = require(__dirname + "/../dist/critical"), yargs = require("yargs"), {hideBin: hideBin} = require("yargs/helpers");

require("colors");

const _yargs = yargs(hideBin(process.argv)).command("url [url+] [options+]\nrun the command line tools", "Example: critical-cli -d 800x600 -d 1024x768 -i https://facebook.com").option("headless", {
    alias: "t",
    description: "enable or disable headless mode",
    type: "boolean",
    defaultDescription: "true"
}).option("browser", {
    alias: "b",
    default: "chromium",
    description: "browser to use",
    choices: [ "chromium", "firefox", "webkit", "edge", "chrome" ],
    defaultDescription: "chromium",
    type: "string"
}).option("screenshot", {
    alias: "i",
    description: "Generate screenshots",
    type: "boolean"
}).option("secure", {
    alias: "s",
    description: "enable or disable security settings such as CSP and same origin policy",
    type: "boolean"
}).option("output", {
    alias: "o",
    description: "Output directory",
    type: "string"
}).option("filename", {
    alias: "n",
    description: "prefix of the generated files",
    type: "string"
}).option("width", {
    alias: "w",
    description: "Viewport width",
    type: "number"
}).option("height", {
    alias: "a",
    description: "Viewport height",
    type: "number"
}).option("dimensions", {
    alias: "d",
    type: "array",
    description: "Array of viewports, override height/width settings",
    defaultDescription: "'1920x1080', '1440x900', '1366x768', '1024x768', '768x1024', '320x480'"
}).option("fonts", {
    alias: "f",
    description: "Generate javascript to load fonts dynamically",
    type: "boolean",
    defaultDescription: "true"
}).option("console", {
    alias: "l",
    description: "Show console messages from the browser",
    type: "boolean",
    defaultDescription: "true"
}).option("container", {
    alias: "c",
    description: "Disable additional security settings to run inside a container",
    type: "boolean"
}).option("html", {
    alias: "p",
    description: "generate an HTML page containing inlined critical css",
    type: "boolean"
}).help().alias("help", "h"), options = _yargs.argv, urls = options._;

for (let key of Object.keys(options)) 1 == key.length && "_" != key && delete options[key];

delete options._, delete options.$0, 0 == urls.length && (_yargs.showHelp(), process.exit()), 
options.container = !0;

for (let url of urls) critical.critical(url, options).catch((error => {
    console.error(error);
}));
