'use strict';

const path = require("node:path");
const fs = require("node:fs");

const hashSum = require('./hashSum').default;

// * В 'ts-node' выло кеширование, но его удалили в коммите [Remove support for ts-node cache output](https://github.com/TypeStrong/ts-node/pull/701/files)
//   Замечание: it was only unreliable for type checking, когда импортируемые ".d.ts" изменялись.
// * Разработчики 'ts-node' рекомендуют использовать [SWC compiler](https://swc.rs/), хотя он только примерно в 2 раза
//    быстрее. А использование кеша - раза в 4 быстрее.
// Больше ссылок по теме кеширования в `ts-node`:
//  * [Restore cache functionality (default to off)](https://github.com/TypeStrong/ts-node/issues/951)
//  * [Disk caching in transpile-only via new project "typescript-cached-transpile"](https://github.com/TypeStrong/ts-node/issues/908)
//  * [typescript-cached-transpile](https://www.npmjs.com/package/typescript-cached-transpile)
//  * [Дискуссию о восстановлении кеша в `ts-node` прикрыли: "Closing, since --swc is so fast that we can avoid any disk caching complexity."](https://github.com/TypeStrong/ts-node/issues/908#issuecomment-1060214613)

// let __debug;
// let __content;
// let __content_mode;
// let __has_content;
let _tsNode_registered = false;
let _tsNode_handler;
let _tsNode_cacheDir = '.';
const originalJsHandler = require.extensions['.js'];
/** @type {'typescript' | 'ttypescript' | '@swc/core'} */
let typescriptCompilerModuleName = 'typescript';
/**
 * Не знаю, понадобиться ли выставлять это значение в `true`, т.к. при этом перестают работать `const enum` и `.d.ts.`-файлов.
 *
 * Но оставляю на всякий случай.
 */
const transpileOnly = false;
//  Пример реализации тут: https://github.com/cspotcode/personal-monorepo/blob/4bb8542e61bd0939f8a4219831e9f193f5e48b58/packages/typescript-cached-transpile/src/cache.ts#L40-L64
const CACHE_CHECK_CORRUPTED_KEY = '\n// "ts-node" AUTO-loader cache check corrupted key: cc1b66d7-e3c4-4c40-aa8a-fae0bfdcc344';

const ignoreImports = false;
// /** @type {typeof import('../../nodejs/sourceCodeUtils') | undefined} */
// let sourceCodeUtilsModule;
/** @type {typeof import('typescript/lib/typescript.d.ts').ts | undefined} */
let typescript;
/** swc compiler */
let swc;
/** @type {string} */
let compilerVersion;

const _IMPORTS_EXTRACTOR_SCAN_MAX_SYMBOLS = 5000;

/**
 * @private
 */
function _ts_extension_handling(module, filename) {
    // if (!sourceCodeUtilsModule) {
    //     const _ignoreImports = ignoreImports;
    //
    //     {// Загружаем typescript-зависимости (они также попадут в кеш)
    //         // Обязательно выключим детект `import`, который реализуется в библиотеке '../../nodejs/sourceCodeUtils' перед
    //         //  загрузкой этой библиотеки, иначе будет циклическая зависимость.
    //         ignoreImports = true;
    //
    //         sourceCodeUtilsModule = require('../../nodejs/sourceCodeUtils');
    //
    //         ignoreImports = _ignoreImports;
    //     }
    // }

    // if (path.extname(originalJsHandler) === '.js') {
    //     return originalJsHandler(m, filename);
    // }
    // __filename_ = { filename, ext: path.extname(filename) };

    // Не нужно тут в названии файла использовать расширение '.js', т.к. из-за этого файлы может попадать в индекс и результаты поиска WebStorm
    const cachedFilePath = path.join(_tsNode_cacheDir, `${hashSum(filename)}_${path.basename(filename, path.extname(filename))}.js__cache`);
    const cachedFileInfoPath = path.join(_tsNode_cacheDir, `${hashSum(filename)}_${path.basename(filename, path.extname(filename))}.js__info.json`);
    let fileStats;

    try {
        fileStats = fs.statSync(filename);
    }
    // eslint-disable-next-line unicorn/catch-error-name
    catch (err) {
        // nothing
    }

    if (fileStats) {
        let cachedFileInfo;
        // let _e;

        try {
            // require .json
            cachedFileInfo = require(cachedFileInfoPath);
        }
        // eslint-disable-next-line unicorn/catch-error-name
        catch (err) {
            // _e = e;
            // Ignore error. Just guess the cache is corrupted.
        }

        // __debug = {
        //     _e,
        //     cachedFileInfoName,
        //     has_cachedFileInfo: !!cachedFileInfo,
        //     is: cachedFileInfo && cachedFileInfo.mtime_iso === fileStats.mtime.toISOString(),
        //     cachedFileInfo_mtime_iso: cachedFileInfo.mtime_iso,
        //     cachedFileStats_mtime: fileStats.mtime.toISOString(),
        // }

        // todo: Дополнительно, читать cachedFileInfo.[importsBeforeCompile/importsAfterCompile], вычислять разницу
        //  между ними, которая по-сути будет являться списком '.d.ts' которые удалились после компиляции typescript'ом.
        //  Дальше, нужно просто проверять, что со времени последней компиляции, эти '.d.ts' НЕ изменились.
        //
        if (cachedFileInfo
            && cachedFileInfo.mtime_iso === fileStats.mtime.toISOString()
            && cachedFileInfo.transpileOnly === transpileOnly
            // Проверим наличие самого файла (генерация путей могла измениться и старое название не актуальное)
            && fs.existsSync(cachedFilePath)
            // todo: && !_checkFileIsLocket(cachedFilePath)
        ) {
            const __compile = module._compile;

            module._compile = function(_code, fileName) {
                // __content_mode = 2;

                const code = fs.readFileSync(cachedFilePath).toString();

                if (!code.endsWith(CACHE_CHECK_CORRUPTED_KEY)) {
                    // code is corrupted
                    // Это может быть из-за того, что процесс, который писал этот файл неожиданно завершился не успев дописать файл
                    // todo: инвалидировать кеш и заново компилировать ts-файл
                    //  Пример реализации тут: https://github.com/cspotcode/personal-monorepo/blob/4bb8542e61bd0939f8a4219831e9f193f5e48b58/packages/typescript-cached-transpile/src/cache.ts#L40-L64
                }
                // todo: Вырезать CACHE_CHECK_CORRUPTED_KEY из конца загруженного code, чтобы ТОЧНО не повлиять на `//# sourceMappingURL=`

                return __compile.call(this, code, fileName);
            };

            return originalJsHandler(module, filename);
        }
    }

    if (!_tsNode_registered) {
        _tsNode_registered = true;

        // todo: [MODULE_COMPILE_REFACTORING_1]
        //  Подставлять для 'ts-node' специальный `require.extensions['.js'] = function ownJSHandler(){}`,
        //   чтобы он запомнил именно наш js-handler. Это нужно для того, чтобы в `typescript.preProcessFile(fs.readFileSync(filename))`
        //   избавиться от ещё одного чтения файла. А вместо чтения, использовать тот код, который сам nodejs для нас прочитает.
        //   Далее, нужно будет переделать механизм подмены module._compile, после того, как его подменил `ts-node`
        require.extensions['.ts'] = void 0;
        require.extensions['.cts'] = void 0;
        require.extensions['.mts'] = void 0;

        const useSWCCompiler = typescriptCompilerModuleName === '@swc/core';

        require('ts-node').register({
            // "swc" быстрее чем "tsc", но требует дополнительных dev-зависимостей.
            // При острой необходимости, можно добавить: `pnpm i -D @swc/core@1.2.143 @swc/helpers@0.3.3`
            swc: useSWCCompiler,
            compiler: useSWCCompiler ? void 0 : typescriptCompilerModuleName,
            transpileOnly: false,
            compilerOptions: {
                allowJs: false,
                // fixme: Указание тут module и target - это костыль из-за того, что `ts-node` берёт tsconfig.json из
                //  проекта в котором запускается, а не из проекта в котором расположен компилируемый ts-файл.
                //  Например, если eslint запускается в проекте `cfphoneui`, то будет использован `cfphoneui/tsconfig.json`
                //   для компиляции файла `cftools/_dev_utils/eslint/callforce-rules/sort-type-constituents.ts`,
                //   а не `cftools/tsconfig.json` как должен был бы.
                module: "commonjs",
                target: "ES2020",
            },
        });

        if (useSWCCompiler) {
            // '@swc/core' уже загружен в память nodejs, достаём из кеша
            swc = require(typescriptCompilerModuleName);
            compilerVersion = swc.version;
        }
        else {
            // 'typescript' / 'ttypescript' уже загружен в память nodejs, достаём из кеша
            typescript = require(typescriptCompilerModuleName);
            compilerVersion = typescript.version;
        }

        _tsNode_handler = require.extensions['.ts'];

        require.extensions['.ts'] = _ts_extension_handling;
    }

    _lockCacheFile(cachedFileInfoPath);

    const __compile = module._compile;

    const detectImportsBeforeSymbol = _IMPORTS_EXTRACTOR_SCAN_MAX_SYMBOLS;
    const detectImportsForThisFile = !ignoreImports && detectImportsBeforeSymbol !== 0;

    // todo: Если включено использование `swc`, то нужно заранее определять где импорт '.d.ts' файла и ЗАМЕНЯТЬ ЕГО
    //  название в коде, добавляя в конце '.d.ts'. Пример: `import { CONST_ENUM_1 } from './enums'` -> `import { CONST_ENUM_1 } from './enums.d.ts'`.
    //  Таким образом, будет решена проблема `const enum` в '.d.ts' файлах для swc, т.к. swc автоматически интерпретирует
    //   '.d.ts' как '.ts' файл.
    //  Но для этого, нужно не читать файл тут, а внедриться в module._compile как описано в [MODULE_COMPILE_REFACTORING_1]
    const importsBeforeCompile = detectImportsForThisFile
        ? typescript.preProcessFile(fs.readFileSync(filename).toString(), true, true)
            .importedFiles.map(file => {
                const { fileName } = file;

                if (fileName.startsWith('node:')) {
                    return;
                }

                return {
                    path: file.fileName,
                };
            }).filter(a => !!a)
        : void 0
    ;
    // const importsBeforeCompile = detectImportsForThisFile
    //     ? sourceCodeUtilsModule.extractImportsFromSource(
    //         fs.readFileSync(filename).toString(),
    //         {
    //             maxLengthToScan: detectImportsBeforeSymbol,
    //         }
    //     )
    //     : void 0
    // ;

    /**
     * @param {string} code
     * @param {string} filename
     * @private
     */
    module._compile = function(code, filename) {
        // __content_mode = 1;
        // __content = code;
        // __debug = fileName;

        let fileStats;

        try {
            fileStats = fs.statSync(filename);
        }
        // eslint-disable-next-line unicorn/catch-error-name
        catch (err) {
            console.error(`[${__filename}]: Can't read file stats for:`, filename);
        }

        if (fileStats) {
            const {
                importsBeforeCompile: _importsBeforeCompile,
                importsAfterCompile,
            } = detectImportsForThisFile
                ? _buildImportsInfo(filename, code, detectImportsBeforeSymbol, importsBeforeCompile)
                : {
                    importsBeforeCompile: [],
                    importsAfterCompile: [],
                }
            ;

            // todo: _checkFileIsLocketNotByMe(cachedFilePath)

            const codeWithCorruptedCheckKey = code + CACHE_CHECK_CORRUPTED_KEY;

            fs.writeFileSync(cachedFilePath, codeWithCorruptedCheckKey);
            fs.writeFileSync(cachedFileInfoPath, JSON.stringify({
                filename,
                mtime_iso: fileStats.mtime.toISOString(),
                transpileOnly,
                detectImportsForThisFile,
                detectImportsBeforeSymbol: ignoreImports ? 0 : detectImportsBeforeSymbol,
                importsBeforeCompile: _importsBeforeCompile || [],
                importsAfterCompile,
                compiler: typescriptCompilerModuleName,
                compilerVersion,
            }));
        }

        return __compile.call(this, code, filename);
    };

    return _tsNode_handler(module, filename);
}

_ts_extension_handling.__is_ts_node_loader = true;

function _lockCacheFile(cachedFilePath) {
    const lockFileName = cachedFilePath + '.lock';

    console.log('Here would be locking the', lockFileName, 'for', cachedFilePath);
    // todo: создавать .lock-файл для того, чтобы избежать "race condition". Только процесс первый заблокировавший
    //  файл `cachedFilePath`, сможет записать файл `cachedFilePath`.
    // todo: .lock-файл должен автоматически удаляться если приложение завершается досрочно (exception или process.exit).
    // todo: При чтении из кеша, если процесс видит, что есть .lock-файл, то он ждёт пока .lock-файл не разблокируется/удалиться.
}

/**
 * @param {string} filename
 * @param {string} codeAfterCompile
 * @param {number} detectImportsBeforeSymbol
 * @param {ReturnType<typeof import('../../nodejs/sourceCodeUtils').extractImportsFromSource>} importsBeforeCompile
 * @private
 */
function _buildImportsInfo(filename, codeAfterCompile, detectImportsBeforeSymbol, importsBeforeCompile) {
    if (!(detectImportsBeforeSymbol > 0)) {
        return {
            importsBeforeCompile,
            importsAfterCompile: [],
        };
    }

    // const _code = codeAfterCompile.length > detectImportsBeforeSymbol ? codeAfterCompile.substring(0, detectImportsBeforeSymbol) : codeAfterCompile;
    const importsAfterCompileMap = {};
    // const importsAfterCompile = importsBeforeCompile ? importsBeforeCompile.filter(path => {
    //     const hasInCompiledCode = _code.includes(`require("${path.path}");`);
    //
    //     importsAfterCompileMap[path.path] = hasInCompiledCode;
    //
    //     return hasInCompiledCode;
    // }) : [];
    const importsAfterCompile = typescript.preProcessFile(codeAfterCompile, true, true)
        .importedFiles.map(file => {
            const { fileName } = file;

            if (fileName.startsWith('node:')) {
                return;
            }

            importsAfterCompileMap[file.fileName] = true;

            return {
                path: file.fileName,
            };
        }).filter(a => !!a)
    ;

    if (importsBeforeCompile) {
        for (const libInfo of importsBeforeCompile) {
            if (importsAfterCompileMap[libInfo.path]) {
                continue;
            }

            // Для каждой зависимости, которая отсутствует в итоговом файле, запросим её дату последнего изменения
            {
                const dirname = path.dirname(filename);
                let resolveError1;
                let resolveError2;
                let fullPath;

                try {
                    fullPath = require.resolve(libInfo.path + '.d.ts', { paths: [ dirname ] });
                    libInfo["isDefinitionFile"] = true;
                }
                catch (err) {
                    resolveError1 = err;

                    try {
                        fullPath = require.resolve(libInfo.path, { paths: [ dirname ] });
                    }
                    catch (err) {
                        resolveError2 = err;
                    }
                }

                if (fullPath) {
                    // require.resolve('node:fs') === 'node:fs'
                    if (fullPath !== libInfo.path) {
                        try {
                            const fileStats = fs.statSync(fullPath);

                            libInfo["fullPath"] = fullPath;
                            libInfo["mtime_iso"] = fileStats.mtime.toISOString();
                        }
                        catch (err) {
                            libInfo["_statSync_fileStats_error"] = String(err.message || err);
                        }
                    }
                }
                else {
                    libInfo["_resolve_fullPath_error1"] = resolveError1 && String(resolveError1.message || resolveError1) || void 0;
                    libInfo["_resolve_fullPath_error2"] = resolveError2 && String(resolveError2.message || resolveError2) || void 0;
                }
            }
        }
    }

    return {
        importsBeforeCompile,
        importsAfterCompile,
    };
}

/**
 *
 * Функция подключит 'ts-node' только по необходимости, если в кеше нет соответствующих файлов.
 *
 * Из-за того, что 'ts-node' загружается опционально, скорость выполнения скрипта вырастает:
 *  - минимум в 4 раза чем безусловно загружать 'ts-node' и компилировать через tsc.
 *  - минимум в 2 раза чем безусловно загружать 'ts-node' и компилировать через swc.
 *
 * Можно добавить в эту функцию options.disableCache для выключения кеша.
 *
 * @param {string=} cacheDirName
 * @param {('typescript' | 'ttypescript' | '@swc/core')=} compilerModuleName
 */
function registerTSNodeAutoLoader({
    cacheDirName = './build_cache/ts-node/',
    compilerModuleName = typescriptCompilerModuleName,
} = {}) {
    if (path.isAbsolute(cacheDirName)) {
        _tsNode_cacheDir = cacheDirName;
    }
    else {
        _tsNode_cacheDir = path.resolve(cacheDirName);
    }

    if (compilerModuleName) {
        typescriptCompilerModuleName = compilerModuleName;
    }

    fs.mkdirSync(_tsNode_cacheDir, { recursive: true });

    const _existed_ts_extension = require.extensions['.ts'];

    if (_existed_ts_extension) {
        if (_existed_ts_extension === _ts_extension_handling
            || _existed_ts_extension.__is_ts_node_loader
        ) {
            return;
        }

        if (_tsNode_handler && _existed_ts_extension === _tsNode_handler) {
            return;
        }

        throw new Error(`${__filename}~${registerTSNodeAutoLoader.name}: handler for '.ts' extension is already defined`);
    }

    _ts_extension_handling.__prev = _existed_ts_extension;

    require.extensions['.ts'] = _ts_extension_handling;
    require.extensions['.cts'] = _ts_extension_handling;
    require.extensions['.mts'] = _ts_extension_handling;
}

function unregisterTSNodeAutoLoader(throwError = true) {
    if (require.extensions['.ts'] === _ts_extension_handling) {
        if (_ts_extension_handling.__prev) {
            require.extensions['.ts'] = _ts_extension_handling.__prev;
            require.extensions['.cts'] = _ts_extension_handling.__prev;
            require.extensions['.mts'] = _ts_extension_handling.__prev;
        }
        else {
            require.extensions['.ts'] = void 0;
            require.extensions['.cts'] = void 0;
            require.extensions['.mts'] = void 0;
        }
    }
    else if (throwError) {
        throw new Error(`Can't "unregisterTSNodeAutoLoader" due current require.extensions['.ts'] is not from "registerTSNodeAutoLoader"`);
    }
    else {
        console.warn(`Can't "unregisterTSNodeAutoLoader" due current require.extensions['.ts'] is not from "registerTSNodeAutoLoader"`);
    }
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
    registerTSNodeAutoLoader,
    unregisterTSNodeAutoLoader,
};
