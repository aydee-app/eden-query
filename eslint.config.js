// @ts-check

import prettier from 'eslint-config-prettier'
import simpleImport from 'eslint-plugin-simple-import-sort'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import tsEslint from 'typescript-eslint'

import eslint from '@eslint/js'

/**
 * ESLint uses minimatch patterns to determine which files to apply rules to.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files#specifying-files-and-ignores
 * @see https://github.com/isaacs/minimatch?tab=readme-ov-file#features
 */
const FILE_PATTERNS = {
  JAVASCRIPT: ['**/*.js', '**/*.jsx'],
  TYPESCRIPT: ['**/*.ts', '**/*.tsx'],
  SVELTE: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
  NODE_MODULES: '/node_modules/',
  WEB_BUILD_OUTPUT: 'apps/web/build/',
  WEB_SVELTEKIT_OUTPUT: 'apps/web/.svelte-kit/',
}

/**
 * Enforce import/export order in all source code.
 *
 * Errors/warnings from this plugin are fixable with `--fix`.
 * For example `eslint --fix` will automatically sort all imports/exports.
 */
const importSortConfigs = tsEslint.config({
  files: [...FILE_PATTERNS.TYPESCRIPT, ...FILE_PATTERNS.SVELTE],

  plugins: {
    'simple-import-sort': simpleImport,
  },

  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
})

const svelteConfigs = tsEslint.config(
  svelte.configs.base,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: FILE_PATTERNS.SVELTE,

    /**
     * @see https://typescript-eslint.io/packages/parser/
     */
    languageOptions: {
      parserOptions: {
        projectService: true,

        // Add support for additional file extensions, such as .svelte
        extraFileExtensions: ['.svelte'],

        parser: tsEslint.parser,

        // Specify a parser for each language, if needed:
        // parser: {
        //   ts: ts.parser,
        //   js: espree,    // Use espree for .js files (add: import espree from 'espree')
        //   typescript: ts.parser
        // },

        // We recommend importing and specifying svelte.config.js.
        // By doing so, some rules in eslint-plugin-svelte will automatically read the configuration and adjust their behavior accordingly.
        // While certain Svelte settings may be statically loaded from svelte.config.js even if you don’t specify it,
        // explicitly specifying it ensures better compatibility and functionality.
      },
    },
  },
)

/**
 * Configuration that applies to all TypeScript files.
 */
const typescriptConfigs = tsEslint.config(
  tsEslint.configs['base'],
  ...tsEslint.configs['recommended'],
  {
    files: [...FILE_PATTERNS.JAVASCRIPT, ...FILE_PATTERNS.TYPESCRIPT, ...FILE_PATTERNS.SVELTE],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,

        /**
         * Sometimes the NodeJS namespace might be referenced, e.g. {@link NodeJS.Timeout}
         */
        NodeJS: false,
      },
    },
    rules: {
      // Allow specifying a type as `any`.
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow unused variables if they start with "_". For example: let _unusedVar = 'hello'
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|\\$\\$)',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Empty objects are used sometimes...
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
)

/**
 * File patterns to ignore.
 */
const ignoresConfig = tsEslint.config({
  ignores: [
    FILE_PATTERNS.NODE_MODULES,
    FILE_PATTERNS.WEB_SVELTEKIT_OUTPUT,
    FILE_PATTERNS.WEB_BUILD_OUTPUT,
  ],
})

const config = tsEslint.config(
  prettier,
  eslint.configs.recommended,
  tsEslint.configs.eslintRecommended,
  ...tsEslint.configs.recommended,
  ...importSortConfigs,
  ...typescriptConfigs,
  ...svelteConfigs,
  ...ignoresConfig,
)

export default config
