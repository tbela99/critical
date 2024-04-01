#!/usr/bin/env node --enable-source-maps
import {critical} from '../dist/index.js';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {default as cliArgs} from '../bin/args.json' assert {type: 'json'};

// @ts-ignore
const _yargs = yargs(hideBin(process.argv)).usage(cliArgs.description);
const aliases = new Map;

aliases.set('h', 'help');

for (const [name, command] of Object.entries(cliArgs.args)) {

    if (aliases.has(command.alias)) {

        throw new Error(`'${name}': Alias ${command.alias} already in use by ${aliases.get(command.alias)}'`);
    }

    aliases.set(command.alias, name);
    _yargs.option(name, command);
}

_yargs.help().alias('help', 'h');

const options = _yargs.argv;

// @ts-ignore
const urls = options._;

for (let key of Object.keys(options)) {

    if (key.length === 1 && key !== '_') {

        // @ts-ignore
        delete options[key];
    }
}


// @ts-ignore
delete options._;
// @ts-ignore
delete options.$0;

if (urls.length === 0) {

    _yargs.showHelp();
    process.exit();
}

// @ts-ignore
// options.container = true;

for (let url of urls) {

    critical(url, options).catch(((url) => {

        return (error) => {

            process.stderr.write(url + '\n' + error);
        }
    })(url));
}
