/** Minimal ESLint config for student frontend submissions (browser globals). */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  ignorePatterns: ['node_modules/**', 'dist/**', 'build/**', 'vendor/**'],
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-redeclare': 'error',
    eqeqeq: ['warn', 'smart']
  }
};
