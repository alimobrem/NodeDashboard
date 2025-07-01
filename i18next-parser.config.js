// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const { CustomJSONLexer } = require('./i18n-scripts/lexers');

// eslint-disable-next-line no-undef
module.exports = {
  sort: true,
  createOldCatalogs: false,
  keySeparator: '~',
  locales: ['en'],
  namespaceSeparator: '~',
  reactNamespace: false,
  defaultNamespace: 'plugin__node-dashboard',
  useKeysAsDefaultValue: true,
  indentation: 2,
  keepRemoved: false,
  output: 'locales/$LOCALE/$NAMESPACE.json',
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/i18n.js',
    '!**/node_modules/**',
  ],

  // see below for more details
  lexers: {
    hbs: ['HandlebarsLexer'],
    handlebars: ['HandlebarsLexer'],

    htm: ['HTMLLexer'],
    html: ['HTMLLexer'],

    mjs: ['JavascriptLexer'],
    js: ['JavascriptLexer'], // if you're writing jsx inside .js files, change this to JsxLexer
    ts: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],
    json: [CustomJSONLexer],

    default: ['JavascriptLexer'],
  },
};
