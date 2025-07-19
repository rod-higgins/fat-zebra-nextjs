import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
  'react/jsx-runtime',
  'crypto',
  'next/server'
];

// Common plugins configuration
const getPlugins = (tsConfigPath = './tsconfig.build.json') => [
  resolve(),
  commonjs(),
  typescript({
    tsconfig: tsConfigPath,
    declaration: false
  })
];

export default [
  // Main library build - ES Module
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },
  
  // Main library build - CommonJS
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Components sub-module - ES Module
  {
    input: 'src/components/index.ts',
    output: {
      file: 'dist/components/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Components sub-module - CommonJS
  {
    input: 'src/components/index.ts',
    output: {
      file: 'dist/components/index.js',
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Hooks sub-module - ES Module
  {
    input: 'src/hooks/index.ts',
    output: {
      file: 'dist/hooks/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Hooks sub-module - CommonJS
  {
    input: 'src/hooks/index.ts',
    output: {
      file: 'dist/hooks/index.js',
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Server sub-module - ES Module
  {
    input: 'src/server/index.ts',
    output: {
      file: 'dist/server/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Server sub-module - CommonJS
  {
    input: 'src/server/index.ts',
    output: {
      file: 'dist/server/index.js',
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Utils sub-module - ES Module
  {
    input: 'src/utils/index.ts',
    output: {
      file: 'dist/utils/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Utils sub-module - CommonJS
  {
    input: 'src/utils/index.ts',
    output: {
      file: 'dist/utils/index.js',
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: getPlugins()
  },

  // Type definitions for main module
  {
    input: 'src/index.ts',
    output: {
      file: pkg.types,
      format: 'esm'
    },
    plugins: [dts()]
  },

  // Type definitions for components
  {
    input: 'src/components/index.ts',
    output: {
      file: 'dist/components/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  // Type definitions for hooks
  {
    input: 'src/hooks/index.ts',
    output: {
      file: 'dist/hooks/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  // Type definitions for server
  {
    input: 'src/server/index.ts',
    output: {
      file: 'dist/server/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  // Type definitions for utils
  {
    input: 'src/utils/index.ts',
    output: {
      file: 'dist/utils/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  }
];