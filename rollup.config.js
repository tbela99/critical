import typescript from '@rollup/plugin-typescript';
import commonjs from "@rollup/plugin-commonjs";
import {dts} from "rollup-plugin-dts";
import json from "@rollup/plugin-json";

const external = ['playwright', 'playwright-core', 'yargs', 'chalk'];
const plugins = [typescript(), commonjs(), json()];
const sourcemap = true;

export default [
    {
        input: ['src/index.ts'],
        plugins,
        external,
        output: [{
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
                sourcemap,
                file: './dist/browser.js',
                format: 'es'
            },
            {
                sourcemap,
                file: './dist/browser-umd.js',
                format: 'iife',
                name: 'critical'
            }
        ]
    },
    {
        input: 'src/index.ts',
        plugins: [dts()],
        output: {

            file: './dist/index.d.ts',
            format: 'es'
        }
    }
]