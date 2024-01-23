import serve from 'rollup-plugin-serve';
import rollupSvelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve'; // pro importování z node_modules
import commonjs from '@rollup/plugin-commonjs'; // pro konverzi CommonJS modulů do ES6
import typescript from '@rollup/plugin-typescript';
//import rollupSwc from 'rollup-plugin-swc3';
import { less } from 'svelte-preprocess-less';
import fs from 'fs';

import { transformCodeToESMPlugin } from './dev/windyRollupPlugins.js';

const useSourceMaps = true;

export default {
    input: 'src/plugin.svelte',
    output: {
        file: 'dist/plugin.js',
        format: 'module',
        sourcemap: useSourceMaps,
    },
    external: id => id.startsWith('@windy/'),
    watch: {
        include: 'src/**',
        exclude: 'node_modules/**',
    },
    plugins: [
        /*rollupSwc({
            include: ['** / *.ts', '** / *.svelte'],
            sourceMaps: useSourceMaps,
            tsconfig: 'tsconfig.json',
        }),*/

        typescript({
            sourceMap: useSourceMaps,
            inlineSources: false,
        }),
        rollupSvelte({
            emitCss: false,
            preprocess: {
                style: less({
                    sourceMap: useSourceMaps ? { sourceMapFileInline: true } : undefined,
                    math: 'always',
                }),
            },
        }),
        resolve({
            browser: true,
            dedupe: ['svelte'],
        }),
        commonjs(),

        transformCodeToESMPlugin(),
        // TODO: add terser()
        serve({
            contentBase: 'dist',
            host: 'localhost',
            port: 9999,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            https: {
                key: fs.readFileSync('dev/key.pem'),
                cert: fs.readFileSync('dev/certificate.pem'),
            },
        }),
    ],
};
