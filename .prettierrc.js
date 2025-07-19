module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  
  // Print width and wrapping
  printWidth: 100,
  proseWrap: 'preserve',
  
  // HTML/JSX specific
  htmlWhitespaceSensitivity: 'css',
  jsxSingleQuote: true,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // Line endings
  endOfLine: 'lf',
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // Quote props
  quoteProps: 'as-needed',
  
  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Range formatting
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Plugin configurations
  plugins: [],
  
  // Override specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        parser: 'babel',
        printWidth: 100,
        tabWidth: 2,
      },
    },
  ],
};