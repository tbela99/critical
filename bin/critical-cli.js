#!/usr/bin/env node --enable-source-maps
import {critical} from '../dist/index.js';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import cliArgs from '../bin/args.json' assert {type: 'json'};
import process from "node:process";

// @ts-ignore
const _yargs = yargs(hideBin(process.argv)).usage(cliArgs.description);
const aliases = new Map;

aliases.set('h', 'help');

for (const [name, command] of Object.entries(cliArgs.args)) {

    if (aliases.has(command.alias)) {

        throw new Error(`'${name}': Alias ${command.alias} already in use by ${aliases.get(command.alias)}'`);
    }

    aliases.set(command.alias, name);
    aliases.set(name.replace(/-([a-z])/g, (all, one) => one.toUpperCase()), name);
    _yargs.option(name, command);
}

for (const name of Object.keys(_yargs.argv)) {

    if (name === '_' || '$0' === name) {

        continue;
    }

    if (!aliases.has(name.replace(/-([a-z])/g, (all, one) => one.toUpperCase()))) {

        throw new Error(`'${name}': Unknown argument`);
    }
}

_yargs.help().alias('help', 'h') /*.strict(true) */;

const options = _yargs.argv;

// @ts-ignore
const urls = options._.slice();

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

if (urls.length === 0 && process.stdin.isTTY) {

    _yargs.showHelp();
    process.exit();
}


if (process.stdin.isTTY == null) {

    urls.length = 0;
    options.input = await new Promise(async (resolve) => {

        let result = '';

        for await (const chunk of process.stdin) {

            result += chunk;
        }

        resolve(result);
    });
}

let result;

if (urls.length === 0) {

    result = [await critical(options).catch((url) => {

        return (error) => {

            process.stderr.write(url + '\n' + error.message + '\n' + error.stack + '\n');
        }
    })];
}

else {

    const promises = [];
// @ts-ignore
    for (let url of urls) {

        promises.push(critical({url, ...options}).catch(((url) => {

            return (error) => {

                process.stderr.write(url + '\n' + error.message + '\n' + error.stack + '\n');
            }
        })(url)));
    }

    result = await Promise.all(promises);
}

if (options.json) {

    console.log(JSON.stringify(result));
}
