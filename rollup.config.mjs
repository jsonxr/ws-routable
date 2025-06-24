import pluginCommonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import pluginTypescript from '@rollup/plugin-typescript';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json' with { type: 'json' };

const typescript = pluginTypescript({ tsconfig: './tsconfig.json', exclude: ['**/__tests__', '**/*.test.ts'] });
const commonjs = pluginCommonjs({ include: 'node_modules/**' });

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.ts',
    output: {
      name: 'wsroutable', // Can't be pkg.name because of "-" in names...
      file: 'dist/ws-routable.umd.min.js',
      format: 'umd',
      sourcemap: true,
    },
    plugins: [resolve(), commonjs, typescript, uglify()],
  },

  // browser-friendly UMD build
  {
    input: 'src/index.ts',
    output: [
      {
        name: 'wsroutable',
        file: 'dist/ws-routable.umd.js',
        format: 'umd',
        sourcemap: true,
      },
      {
        name: 'wsroutable',
        file: 'dist/ws-routable.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        name: 'wsroutable',
        file: 'dist/ws-routable.cjs',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins: [resolve(), commonjs, typescript],
  },

  // // CommonJS (for Node) and ES module (for bundlers) build.
  // // (We could have three entries in the configuration array
  // // instead of two, but it's quicker to generate multiple
  // // builds from a single configuration where possible, using
  // // an array for the `output` option, where we can specify
  // // `file` and `format` for each target)
  // {
  //   input: 'src/index.ts',
  //   output: [
  //     //{ file: pkg.main, format: 'cjs', sourcemap: true },
  //     { file: pkg.module, format: 'esm', sourcemap: true },
  //   ],

  //   plugins: [resolve(), commonjs, typescript],
  // },
];
