import resolve from '@rollup/plugin-node-resolve';
import pluginCommonjs from '@rollup/plugin-commonjs';
import pluginTypescript from '@rollup/plugin-typescript';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

const typescript = pluginTypescript({ tsconfig: './tsconfig.json', exclude: ['**/__tests__', '**/*.test.ts'] });
const commonjs = pluginCommonjs({ include: 'node_modules/**' });

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.ts',
    output: {
      name: 'wsroutable', // Can't be pkg.name because of "-" in names...
      file: pkg.browser, // dist/ws-routable.umd.js
      format: 'umd',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs,
      typescript,
      uglify(), // Comment out if want to be able to read...
    ],
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true },
    ],

    plugins: [resolve(), commonjs, typescript],
  },
];
