import typescript from '@rollup/plugin-typescript';
import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";
import {dts} from "rollup-plugin-dts";

const external = ['playwright', 'playwright-core', 'yargs', 'chalk'];
const plugins = [typescript(), commonjs()];
const sourcemap = true;

export default [
    {
        input: ['src/index.ts'],
        plugins,
        external,
        output: [{
            // file: './dist/critical.js',
            dir: './dist',
            preserveModules: true,
            sourcemap,
            name: 'critical',
            format: 'es',
        }]
    },
    {
        input: 'src/browser.ts',
        plugins,
        external,
        output: [
            {
                file: './dist/browser.js',
                format: 'umd',
                name: 'critical'
            },
            {
                file: './dist/browser.min.js',
                plugins: [terser()],
                format: 'iife',
                name: 'umd'
            }
        ]
    },
    // {
    //     input: 'src/critical-cli.ts',
    //     external,
    //     output: [{
    //         file: './bin/critical-cli.js',
    //         name: 'critical'
    //     }],
    //     plugins: [
    //         typescript(),
    //         terser({
    //             mangle: false,
    //             output: {
    //
    //                 beautify: true,
    //                 preamble: '#!/usr/bin/env node'
    //             }
    //         })
    //     ]
    // },
    {
        input: 'src/index.ts',
        plugins: [dts()],
        output: {

            file: './dist/index.d.ts',
            format: 'es'
        }
    }
]