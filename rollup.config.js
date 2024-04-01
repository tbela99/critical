import typescript from '@rollup/plugin-typescript';
import terser from "@rollup/plugin-terser";
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
    {
        input: 'src/index.ts',
        plugins: [dts()],
        output: {

            file: './dist/index.d.ts',
            format: 'es'
        }
    }
]