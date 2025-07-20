import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const createConfig = (input, output, declaration = false) => ({
  input,
  output,
  external: [
    // React dependencies
    'react',
    'react-dom',
    'react/jsx-runtime',
    // Next.js dependencies
    'next',
    'next/server',
    'next/navigation',
    'next/router',
    // Node.js built-ins
    'crypto',
    'http',
    'https',
    'url',
    'path',
    'fs',
    'util',
    // Other external dependencies
    '@fat-zebra/sdk'
  ],
  plugins: [
    resolve({
      browser: output.format !== 'cjs',
      preferBuiltins: output.format === 'cjs',
      exportConditions: output.format === 'esm' ? ['import', 'module', 'default'] : ['require', 'node', 'default']
    }),
    commonjs({
      include: 'node_modules/**',
      requireReturnsDefault: 'auto'
    }),
    typescript({
      tsconfig: './tsconfig.build.json',
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
        outDir: 'dist'
      }
    })
  ],
  onwarn: (warning, warn) => {
    // Suppress specific warnings
    if (warning.code === 'UNRESOLVED_IMPORT') {
      // Allow unresolved imports for external packages
      return;
    }
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      // Suppress circular dependency warnings from node_modules
      if (warning.message.includes('node_modules')) {
        return;
      }
    }
    warn(warning);
  }
});

export default [
  // Main library build - CommonJS
  createConfig(
    'src/index.ts',
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    false
  ),
  
  // Main library build - ES Module
  createConfig(
    'src/index.ts',
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    false
  ),
  
  // Server module build - CommonJS
  createConfig(
    'src/server/index.ts',
    {
      file: 'dist/server/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    false
  ),
  
  // Server module build - ES Module
  createConfig(
    'src/server/index.ts',
    {
      file: 'dist/server/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    false
  ),
  
  // Components module build - CommonJS
  createConfig(
    'src/components/index.ts',
    {
      file: 'dist/components/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    false
  ),
  
  // Components module build - ES Module
  createConfig(
    'src/components/index.ts',
    {
      file: 'dist/components/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    false
  )
];