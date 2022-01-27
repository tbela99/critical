import {terser} from "rollup-plugin-terser";

export default [
    {
        input: 'src/index.js',
        output: [{
            file: './dist/critical.js',
            name: 'critical',
            format: 'umd',
        }]
    },
    {
        input: 'src/browser.js',
        output: [{
            file: './dist/browser.js',
            format: 'iife',
            name: 'critical'
        },
            {
                file: './dist/browser.min.js',
                plugins: [terser()],
                format: 'iife',
                name: 'critical'
            }]
    },
    {
        input: 'src/critical-cli.js',
        output: [{
            file: './bin/critical-cli.js',
            name: 'critical'
        }],
        plugins: [
            terser({
                mangle: false,
                output: {

                    beautify: true,
                    preamble: '#!/usr/bin/env node'
                }
            })
        ]
    }
]