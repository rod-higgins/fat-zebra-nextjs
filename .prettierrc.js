module.exports = {
  // Print width
  printWidth: 100,
  
  // Tab width
  tabWidth: 2,
  
  // Use tabs instead of spaces
  useTabs: false,
  
  // Semicolons
  semi: true,
  
  // Single quotes
  singleQuote: true,
  
  // Quote props
  quoteProps: 'as-needed',
  
  // JSX quotes
  jsxSingleQuote: false,
  
  // Trailing commas
  trailingComma: 'es5',
  
  // Bracket spacing
  bracketSpacing: true,
  
  // JSX bracket same line
  jsxBracketSameLine: false,
  bracketSameLine: false,
  
  // Arrow function parentheses
  arrowParens: 'always',
  
  // Range
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Parser
  parser: undefined,
  
  // File path
  filepath: undefined,
  
  // Require pragma
  requirePragma: false,
  
  // Insert pragma
  insertPragma: false,
  
  // Prose wrap
  proseWrap: 'preserve',
  
  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',
  
  // Vue files script and style tags indentation
  vueIndentScriptAndStyle: false,
  
  // End of line
  endOfLine: 'lf',
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // Single attribute per line
  singleAttributePerLine: false,
  
  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2
      }
    }
  ]
};