module.exports = {
  ignorePatterns: ['test'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['./tsconfig.json']
      }
    }
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'standard-with-typescript',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  root: true,
  env: {
    node: true,
    jest: true
  },
  rules: {
    'linebreak-style': ['error', 'unix'],
    'eol-last': ['error', 'always'],
    curly: ['error', 'all'],
    'brace-style': ['error', '1tbs', { allowSingleLine: false }]
  }
}
