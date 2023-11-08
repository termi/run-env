'use strict';

import type { InitialOptionsTsJest, TsJestGlobalOptions } from 'ts-jest/dist/types';
import type { Config as JestConfig } from '@jest/types';

import { join as joinPath } from 'node:path';

// require('../_dev_utils/jest/jestProcess_onCreate');

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const SECONDS_5 = SECONDS * 5;
const MINUTES_5 = MINUTES * 5;

type ExtendedGlobalThis = typeof globalThis & {
    __CACHE_ROOT__?: string,
    __USE_JSDOM__?: boolean,
}

const cacheDirRoot = String((globalThis as ExtendedGlobalThis).__CACHE_ROOT__ || '');
const isInWebStormDebuggerMode = !!process.env["JB_IDE_HOST"];
const thisProjectName = __dirname;// require('../_build_lib/utils').findProjectName(process.cwd());
const isUseJSDOM = (globalThis as ExtendedGlobalThis).__USE_JSDOM__ === true;
// Добавил это, чтобы DOM API работала в тестах. Возможно, это повлияет как-то на nodejs-специфические тесты - это ещё нужно проверить.
const testEnvironment = isUseJSDOM ? 'jsdom' : void 0;
const TEST_DEFAULT_TIMEOUT_INTERVAL = isInWebStormDebuggerMode
    ? MINUTES_5
    : SECONDS_5
;

process.env["TEST_DEFAULT_TIMEOUT_INTERVAL"] = String(TEST_DEFAULT_TIMEOUT_INTERVAL);

// use cftools/tsconfig.json instead of cftools/spec/tsconfig.json
const tsconfig = require('./tsconfig.json');
const {
    compilerOptions,
} = tsconfig as {
    compilerOptions: Exclude<TsJestGlobalOptions["tsconfig"], boolean | string | void>,
};
const {
    /**
     * @see [ts-jest / config / paths-mapping]{@link https://huafu.github.io/ts-jest/user/config/#paths-mapping}
     *
     * @example
     * {"^cftools/(.*)$":"<rootDir>/../cftools/$1","^cfphone/(.*)$":"<rootDir>/../cfphone/$1","^cfplayer/(.*)$":"<rootDir>/../cfplayer/$1","^cfmodels/(.*)$":"<rootDir>/../cfmodels/$1","^cfuikit/(.*)$":"<rootDir>/../cfuikit/$1","^junct\\.io/(.*)$":"<rootDir>/../junct.io/$1"}
     */
    moduleNameMapper,
}: InitialOptionsTsJest = {
    moduleNameMapper: compilerOptions.paths
        ? require('ts-jest').pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })
        : void 0
    ,
};

delete compilerOptions.outDir;

// Тип кода создаваемого итогового файла.
compilerOptions.target = 'es2020';
// Включаем для ТЕСТОВЫХ (spec) файлов
compilerOptions.sourceMap = true;
compilerOptions.removeComments = false;
// Не удалять объявления const enum из итогового файла.
compilerOptions.preserveConstEnums = true;
// Создавать ли соответствующие файлы ".d.ts"?
compilerOptions.declaration = false;
compilerOptions.strict = false;
compilerOptions.strictFunctionTypes = false;
compilerOptions.strictPropertyInitialization = false;
compilerOptions.noImplicitAny = false;
compilerOptions.noImplicitThis = false;
compilerOptions.allowJs = true;
compilerOptions.skipLibCheck = false;
compilerOptions.noEmitOnError = false;
compilerOptions.resolveJsonModule = true;
// compilerOptions.types = [ ...(compilerOptions.types || []), 'jest-extended/types' ];

const tsJest_globals: TsJestGlobalOptions = {
    // https://kulshekhar.github.io/ts-jest/docs/getting-started/options#options
    compiler: 'typescript',
    diagnostics: false,
    // https://kulshekhar.github.io/ts-jest/docs/getting-started/options/tsconfig#inline-compiler-options
    // https://www.typescriptlang.org/docs/handbook/compiler-options.html#compiler-options
    tsconfig: compilerOptions,
    // isolatedModules: true,
};

const cacheDirectories = cacheDirRoot
    ? `<rootDir>/${cacheDirRoot}/`
    : [
        `<rootDir>/build/`,
        `<rootDir>/build_cache/`,
        `<rootDir>/build_ts/`,
        `<rootDir>/dist/`,
    ]
;

/**
 * @see [ts-jest / Configuration]{@link https://huafu.github.io/ts-jest/user/config/}
 */
const jestConfigOptions: JestConfig.InitialOptions = {
    // maxWorkers: '50%',
    testTimeout: TEST_DEFAULT_TIMEOUT_INTERVAL,
    clearMocks: true,
    // setupFiles: ['./frontend/testUtils/helpers.js'],
    testMatch: [ '<rootDir>/spec/**/*_(spec|test|snap).?([cm])[jt]s?(x)' ],
    // testRegex : /\/spec\/\*\*\/?(*.)+_(spec|test|snap).[jt]s?(x)/,
    // modulePathIgnorePatterns: [ "<rootDir>/build/", joinPath('<rootDir>', cacheDirRoot, 'build_cache'), '/node_modules/' ],
    // testPathIgnorePatterns: [ "<rootDir>/build/", joinPath('<rootDir>', cacheDirRoot, 'build_cache'), '/node_modules/' ],

    modulePathIgnorePatterns: [
        ...cacheDirectories,
        '/node_modules/',
    ],
    testPathIgnorePatterns: [
        ...cacheDirectories,
        '/node_modules/',
        '<rootDir>/spec_utils/',
        // '<rootDir>/spec_data/',
    ],
    coveragePathIgnorePatterns: [
        ...cacheDirectories,
        '/node_modules/',
        '<rootDir>/spec_utils/',
        // '<rootDir>/spec_data/',
    ],
    verbose: false,
    preset: 'ts-jest',
    testEnvironment,
    globals: {
        'ts-jest': tsJest_globals,
    },
    cacheDirectory: joinPath('./', cacheDirRoot, 'build_cache/ts-jest/'),
    moduleNameMapper,
    // Build in Jest Babel will also be disabled by this
    transform: {
        "^.+\.[cm]?tsx?$": "<rootDir>/build_utils/ts_jest_transform_wrapper.js",
    },
};

module.exports = jestConfigOptions;
