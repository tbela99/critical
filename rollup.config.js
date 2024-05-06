import typescript from '@rollup/plugin-typescript';
import commonjs from "@rollup/plugin-commonjs";
import {dts} from "rollup-plugin-dts";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";

const external = ['playwright', 'playwright-core', 'yargs', 'chalk'];
const plugins = [typescript(), commonjs(), json(), nodeResolve()];
const sourcemap = true;

export default [
    {
        input: ['src/index.ts'],
        plugins,
        external: external.concat('@tbela99/css-parser'),
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
        plugins: [nodeResolve(), dts()],
        output: {

            file: './dist/index.d.ts',
            format: 'es'
        }
    }
]