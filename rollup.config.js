import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

const createConfig = (input, output, declaration = false) => ({
  input,
  output,
  external: [
    'react',
    'react-dom',
    'next/server',
    '@fat-zebra/sdk'
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs({
      include: 'node_modules/**',
      requireReturnsDefault: 'auto'
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration,
      declarationMap: declaration,
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'tests/**/*',
        'examples/**/*'
      ],
      compilerOptions: {
        declaration,
        declarationMap: declaration,
        outDir: output.dir || 'dist'
      }
    })
  ],
  onwarn: (warning, warn) => {
    // Suppress warnings about external modules
    if (warning.code === 'UNRESOLVED_IMPORT' && warning.source === 'next/server') {
      return;
    }
    warn(warning);
  }
});

export default [
  // Main library build
  createConfig(
    'src/index.ts',
    [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    true
  ),
  
  // Server module build
  createConfig(
    'src/server/index.ts',
    [
      {
        file: 'dist/server/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/server/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    true
  ),
  
  // Components module build
  createConfig(
    'src/components/index.ts',
    [
      {
        file: 'dist/components/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/components/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    true
  )
];