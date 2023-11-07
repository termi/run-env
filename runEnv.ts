// noinspection JSValidateJSDoc

'use strict';

// https://stackoverflow.com/a/23619712
// https://github.com/emscripten-core/emscripten/blob/54b0f19d9e8130de16053b0915d114c346c99f17/src/shell.js
// var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
// var ENVIRONMENT_IS_WEB = typeof window === 'object';
// var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// see also https://github.com/foo123/asynchronous.js/blob/master/asynchronous.js
// see also https://github.com/iliakan/detect-node

// noinspection ThisExpressionReferencesGlobalObjectJS
const _global = (function getGlobal(this: typeof globalThis) {
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    // es6-shim
    // the only reliable means to get the global object is
    // `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof global !== 'undefined') {
        return global;
    }

    // throw new Error('unable to locate global object');
    return this;
}).call(this as unknown as typeof globalThis);

/**
 * [`node:process` free solution](https://github.com/flexdinesh/browser-or-node/issues/27)
 */
const nodeProcess = _global["process"];
const _IS_PROCESS = typeof nodeProcess !== 'undefined' && !!nodeProcess;
const _IS_REQUIRE = typeof require === 'function';
const _IS_WINDOW = typeof window !== 'undefined' && !!window;
const _IS_DOCUMENT = typeof document !== 'undefined' && !!document;
// todo:
//  [in isJsDom there is no check on navigator.userAgent](https://github.com/flexdinesh/browser-or-node/issues/28)
//   navigator can be `{appName: 'nodejs'}` todo: checkIsWebCompatibleNavigator(navigator) { return typeof navigator === 'object' && !!navigator && typeof navigator.userAgent === 'string' }
const _IS_NAVIGATOR = typeof navigator === 'object' && !!navigator;
const _toString = Object.prototype.toString;

const ELECTRON__MAIN = 1;
const ELECTRON__RENDERER_WITH_NODE_INTEGRATION = 2;
const ELECTRON__NO_NODE_INTEGRATION = 3;
const ELECTRON__WEB_WORKER_NODE_INTEGRATION = 4;

// https://github.com/electron/electron/issues/2288
// see also: https://github.com/cheton/is-electron/
function _getElectronEnv() {
    // Renderer process
    // en: https://www.electronjs.org/docs/latest/api/process#processtype-readonly
    // ru: https://www.electronjs.org/ru/docs/latest/api/process#processtype-%D1%82%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%87%D1%82%D0%B5%D0%BD%D0%B8%D0%B5
    // process.type: A String representing the current process's type, can be:
    // * browser - The main process
    // * renderer - A renderer process
    // * worker - In a web worker
    if (_IS_WINDOW && typeof window["process"] === 'object' && !!window["process"] && window["process"]["type"] === 'renderer') {
        return ELECTRON__RENDERER_WITH_NODE_INTEGRATION;
    }

    // Main process
    if (_IS_PROCESS && typeof nodeProcess.versions === 'object' && !!nodeProcess.versions.electron) {
        // For
        // ```
        // const win = new BrowserWindow({ webPreferences: { nodeIntegrationInWorker: true, contextIsolation: false } });
        // ```
        // process.type should be 'worker'
        return nodeProcess["type"] === 'worker' ? ELECTRON__WEB_WORKER_NODE_INTEGRATION : ELECTRON__MAIN;
    }

    // Detect the user agent when the `nodeIntegration` option is set to false
    // eslint-disable-next-line unicorn/prefer-includes
    if (_IS_NAVIGATOR && typeof navigator["userAgent"] === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        return ELECTRON__NO_NODE_INTEGRATION;
    }

    return 0;
}

const ELECTRON_ENV = _getElectronEnv();
const ENVIRONMENT_IS_ELECTRON = ELECTRON_ENV !== 0;
const ENVIRONMENT_IS_ELECTRON_WEB_WORKER_NODE_INTEGRATION = ELECTRON_ENV === ELECTRON__WEB_WORKER_NODE_INTEGRATION;

let ENVIRONMENT_IS_NODE = _IS_PROCESS
    // Don't get fooled by e.g. browserify environments.
    // Only Node.JS has a process variable that is of [[Class]] process
    && _toString.call(nodeProcess) === "[object process]"
    // if the checks above will not be enough:
    // && typeof require === 'function'
    // && Object.prototype.toString.call(_global) === "[object global]"
    // // from https://github.com/realm/realm-js/blob/992392e477cb2f5b059b21f6f04edb5f5e7073c2/packages/realm-network-transport/src/NetworkTransport.ts#L24
    // && "node" in process.versions
;
let ENVIRONMENT_IS_NODE_MAIN_THREAD = false;

function _getDenoEnvVariables() {
    const globalDeno = _global["Deno"] as {
        version?: {
            deno: string,
            v8: string,
            typescript: string,
        },
        [key: string]: unknown,
    } | undefined;

    if (!globalDeno
        || !globalDeno.version
        || !globalDeno.version.deno
    ) {
        return [];
    }

    /**
     * note: Deno navigator exists in Deno Worker's.
     */
    const denoNavigator = _IS_NAVIGATOR
        ? navigator as unknown as {
            userAgent: `Deno/${number}.${number}.${number}`,
            hardwareConcurrency: number,
            language: string,
            languages: string[],
        }
        : void 0
    ;
    /**
     * @see [Deno Worker]{@link https://deno.land/api?s=Worker}
     */// @ts-expect-error// eslint-disable-line @typescript-eslint/ban-ts-comment
    const isWorker = typeof WorkerGlobalScope !== 'undefined'
        && 'onmessage' in _global
        && 'postMessage' in _global
    ;
    /**
     * In Deno, importScripts is optional for Worker's.
     *
     * @see [Using the "lib" property / "webworker.importscripts"]{@link https://docs.deno.com/runtime/manual/advanced/typescript/configuration#using-the-lib-property}
     */
    const is_importScriptsPermissionInWorker = typeof _global["importScripts"] === 'function';

    return [
        globalDeno,
        denoNavigator,
        isWorker,
        is_importScriptsPermissionInWorker,
    ] as const;
}

const _denoEnvTuple = _getDenoEnvVariables();

const ENVIRONMENT_IS_DENO = !!_denoEnvTuple[0/*globalDeno*/];
// noinspection PointlessBooleanExpressionJS
const ENVIRONMENT_IS_DENO_WORKER = ENVIRONMENT_IS_DENO && !!_denoEnvTuple[2/*isWorker*/];
const ENVIRONMENT_IS_DENO_MAIN_THREAD = ENVIRONMENT_IS_DENO
    && !ENVIRONMENT_IS_DENO_WORKER
;
// noinspection PointlessBooleanExpressionJS
const ENVIRONMENT_IS_DENO_WORKER_WITH_IMPORT_SCRIPTS = ENVIRONMENT_IS_DENO_WORKER
    && !!_denoEnvTuple[3/*is_importScriptsPermissionInWorker*/]
;

/**
 * Version 12.0.0:
 *  * Fixed `window.name` to default to the empty string, per spec, instead of `"nodejs"`.
 *  * Fixed the default User-Agent to say "unknown OS" instead of "undefined" when jsdom is used in web browsers.
 *
 * @see [jsdom / releases / `window.name == ""` now]{@link https://github.com/jsdom/jsdom/releases/tag/12.0.0}
 * @see [jsdom / issues / What is the best way to detect if the script is running in JSDOM environment?]{@link https://github.com/jsdom/jsdom/issues/1537}
 */
const ENVIRONMENT_IS_JSDOM = (_IS_WINDOW && window.name === 'nodejs')
    || (_IS_NAVIGATOR
        && typeof (navigator as ((typeof navigator) | { userAgent?: string })).userAgent === 'string'
        && (navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom'))
    )
;

const ENVIRONMENT_IS_NWJS = _IS_PROCESS
    && typeof _global["nw"] === 'object'
    && _global["nw"]["process"] === nodeProcess
    // && !!nodeProcess.versions.nw
    // && !!nodeProcess.__nwjs
;

if (_IS_PROCESS) {
    if (ENVIRONMENT_IS_NODE) {// Maybe this is Node.js
        if (_IS_WINDOW) {
            // global `window` is defined
            if (ENVIRONMENT_IS_ELECTRON) {
                // todo: Support electron with JSDOM (for electron's test environment?)
                // this is Electron process.
                //  isNodeJS = true for Main Electron process
                //  isNodeJS = false for Renderer or without node integration processes
                ENVIRONMENT_IS_NODE = ELECTRON_ENV === ELECTRON__MAIN;
            }
            else if (ENVIRONMENT_IS_NWJS) {
                // todo: nwjs main window is mixed_context with both Node context and DOM context,
                //  so ONLY for nwjs main window it should be `isNodeJS == true && isWeb == true`.
                ENVIRONMENT_IS_NODE = true;
            }
            // todo: use ENVIRONMENT_ISDOM in this check
            else if (!String(window.print).includes('[native code]')) {
                // This is workaround for jest+JSDOM due jsdom is used automatically (https://github.com/facebook/jest/issues/3692#issuecomment-304945928)
                ENVIRONMENT_IS_NODE = true;
            }
            else if (window["jasmine"]) {
                // jest/jasmine tests environment
                const keys = [ 'describe', 'xdescribe', 'it', 'xit', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'test', 'xtest', 'expect' ];
                let isJasmine = true;

                for (let i = 0, len = keys.length ; i < len ; i++) {
                    const key = keys[i];

                    if (!(key in window)) {
                        isJasmine = false;

                        break;
                    }
                }

                if (!isJasmine) {
                    // this is something else other than jest/jasmine
                    ENVIRONMENT_IS_NODE = false;
                }
            }
            else {
                ENVIRONMENT_IS_NODE = false;
            }
        }
        else if (ENVIRONMENT_IS_ELECTRON_WEB_WORKER_NODE_INTEGRATION) {
            // this is Electron process.
            //  isNodeJS = false for nodeIntegrationInWorker=true in a web worker
            ENVIRONMENT_IS_NODE = false;
        }
        else if (nodeProcess["browser"]) {
            // babel process shim
            ENVIRONMENT_IS_NODE = false;
        }
        // else {
        //     ENVIRONMENT_IS_NODE === true
        // }
    }

    if (ENVIRONMENT_IS_NODE) {
        try {
            // (-) `const worker_threads = require('worker_threads');`
            const _requireFunc = _IS_REQUIRE ? require : void 0;
            // Trying to hide `require('module_name')` from bundlers and builders:
            // Hide require from "rollup", "webpack" and it's friends
            const worker_threads = _makeRequire(_requireFunc, _stringReverse('worker_threads')) as typeof import('worker_threads') | void;
            // prev version: const worker_threads = (new Function('return req' + 'uire("worker_threads")')());

            if (worker_threads && typeof worker_threads["isMainThread"] === 'boolean') {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = worker_threads.isMainThread;
            }
            else {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
            }
        }
        catch {
            // old nodejs without Worker's support
            ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
        }
    }
}

/**
 * Can be Web Worker or Deno Worker.
 */
const ENVIRONMENT_IS_WEB_WORKER = !ENVIRONMENT_IS_NODE
    // && typeof 'onmessage' in _global
    // && typeof 'postMessage' in _global
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof WorkerGlobalScope !== 'undefined'
    // in Deno, importScripts is optional for Worker's
    && (ENVIRONMENT_IS_DENO
        || typeof (/** @type {import("typescript/lib/lib.webworker").WorkerGlobalScope} */_global)["importScripts"] === 'function'
    )
    && !_IS_DOCUMENT
    && !_IS_WINDOW
    && _IS_NAVIGATOR
    // Can't <reference lib="webworker" /> due error like:
    // `TS2403: Subsequent variable declarations must have the same type. Variable 'location' must be of type 'Location', but here has type 'WorkerLocation'.  lib.dom.d.ts(19615, 13): 'location' was also declared here.`
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof WorkerNavigator !== 'undefined' && (/** @type {import("typescript/lib/lib.webworker").WorkerNavigator} */navigator) instanceof WorkerNavigator
;
const ENVIRONMENT_IS_WEB_WORKLED = !ENVIRONMENT_IS_NODE
    // Deno (now?) not support Worklet's
    && !ENVIRONMENT_IS_DENO
    && typeof (_global["WorkletGlobalScope"]) !== 'undefined'
;
const ENVIRONMENT_IS_WEB_MAIN_PROCESS_COMPATIBLE = _IS_WINDOW
    && _global === window
    && !ENVIRONMENT_IS_WEB_WORKLED
    && !ENVIRONMENT_IS_WEB_WORKER
    /*
    In Electon Renderer process (Web Window) with { nodeIntegration: true, contextIsolation: false }: `Object.prototype.toString.call(window) === '[object global]'`.
    Also see: https://www.electronjs.org/docs/latest/api/process#processcontextisolated-readonly
    */
    && ((ELECTRON_ENV === ELECTRON__RENDERER_WITH_NODE_INTEGRATION && _IS_PROCESS && nodeProcess["contextIsolated"] === false)
        ? _toString.call(window) === '[object global]'
        : _toString.call(window) === '[object Window]'
    )
    && _IS_DOCUMENT
    && _IS_NAVIGATOR
;
const ENVIRONMENT_IS_WEB_PROCESS = ENVIRONMENT_IS_WEB_MAIN_PROCESS_COMPATIBLE
    && !ENVIRONMENT_IS_NODE
    && !ENVIRONMENT_IS_DENO
;
// Based on https://stackoverflow.com/a/39473604
// todo: Как выставлять isWeb для ReactNative: в true или в false? Нужно понять, как для ReactNative пишется код и
//   совместим ли он с кодом для "обычного" Web'а.
// noinspection JSDeprecatedSymbols
const ENVIRONMENT_IS_REACT_NATIVE = !_IS_DOCUMENT
    && _IS_NAVIGATOR
    && navigator.product === 'ReactNative'
;

const ENVIRONMENT_IS_MAIN_THREAD = ENVIRONMENT_IS_NODE
    ? ENVIRONMENT_IS_NODE_MAIN_THREAD
    : ENVIRONMENT_IS_DENO
        ? !ENVIRONMENT_IS_DENO_WORKER
        : (
            ENVIRONMENT_IS_WEB_PROCESS
            && !ENVIRONMENT_IS_WEB_WORKER
            && !ENVIRONMENT_IS_WEB_WORKLED
        )
;
const ENVIRONMENT_IS_WORKER_OR_WORKLED_THREAD = ENVIRONMENT_IS_NODE
    ? !ENVIRONMENT_IS_NODE_MAIN_THREAD
    : (ENVIRONMENT_IS_WEB_WORKER || ENVIRONMENT_IS_WEB_WORKLED)
;
const ENVIRONMENT_IS_WEB = ENVIRONMENT_IS_WEB_PROCESS
    || (ENVIRONMENT_IS_WEB_WORKER && !ENVIRONMENT_IS_DENO)
    || ENVIRONMENT_IS_WEB_WORKLED
;

// Trying to hide `require('module_name')` from bundlers and builders
function _makeRequire(requireFunc: typeof require | undefined, moduleNameInReverse: string) {
    if (!requireFunc) {
        return;
    }

    return requireFunc(_stringReverse(moduleNameInReverse));
}

// Trying to hide `require('module_name')` from bundlers and builders
function _stringReverse(str: string) {
    return [ ...str ].reverse().join('');
}

// ===========================================================================================
// -----------============================== exports ==============================-----------
// ===========================================================================================

/**
 * Is this code running in **non-Worker** environment? For browser and nodejs.
 *
 * `true` if negative {@link isNodeJSWorker} and {@link isWebWorker}, and {@link isWebWorklet}, and {@link isDenoWorker}.
 *
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 * @see [isWebMainThread]{@link isWebMainThread}
 * @see [isDenoMainThread]{@link isDenoMainThread}
 */
export const isMainThread: boolean = ENVIRONMENT_IS_MAIN_THREAD;

/**
 * Is this code running in **Worker** environment? For browser (worker and worklet) and nodejs (worker).
 *
 * `true` if positive {@link isNodeJSWorker} or {@link isWebWorker}, or {@link isWebWorklet}, or {@link isDenoWorker}.
 *
 * {@link isNodeJSMainThread}, {@link isWebMainThread} and {@link isDenoMainThread} will be `false`.
 */
export const isWorkerThread: boolean = ENVIRONMENT_IS_WORKER_OR_WORKLED_THREAD;

// -----------============================== NodeJS details ==============================-----------

/**
 * Is this code running in nodejs environment?
 *
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 * @see [isNodeJSDependentProcess]{@link isNodeJSDependentProcess}
 * @see [isNodeJSWorker]{@link isNodeJSWorker}
 */
export const isNodeJS: boolean = ENVIRONMENT_IS_NODE;

/**
 * Is this code running in nodejs **non-Worker** environment?
 *
 * If `true`, {@link isNodeJS} will be `true` and {@link isNodeJSWorker} will be `false`.
 */
export const isNodeJSMainThread: boolean = ENVIRONMENT_IS_NODE && ENVIRONMENT_IS_NODE_MAIN_THREAD;

// Also, `process.env.NODE_UNIQUE_ID` will have value for subprocess forked with `cluster` module
//  https://nodejs.org/api/cluster.html#cluster_cluster_isprimary
//  cluster.isPrimary: True if the process is a primary. This is determined by the process.env.NODE_UNIQUE_ID. If process.env.NODE_UNIQUE_ID is undefined, then isPrimary is true.
// Also see https://www.npmjs.com/package/node-ipc
/**
 * Is Node.js process is spawned with an IPC channel (see the [Child Process]{@link https://nodejs.org/api/child_process.html}
 * and [Cluster]{@link https://nodejs.org/api/cluster.html} documentation).
 *
 * [`process.send`]{@link https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback}
 * and
 * [`process.disconnect`]{@link https://nodejs.org/api/process.html#processdisconnect}
 * functions is defined.
 *
 * Node.js docs about IPC channel and subprocess:
 *
 * > When an IPC channel has been established between the parent and child ( i.e. when using [child_process.fork()](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options)),
 * > the `subprocess.send()` method can be used to send messages to the child process. When the child process is a
 * > Node.js instance, these messages can be received via the ['message'](https://nodejs.org/api/process.html#process_event_message)
 * > event.
 * >
 * > Child Node.js processes will have a process.send() method of their own that allows the child to send messages back to the parent.
 * >
 * > Accessing the IPC channel fd in any way other than [process.send()](https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback)
 * > or using the IPC channel with a child process that is not a Node.js instance is not supported.
 * >
 * > See example here: [nodejs/docs/child_process/subprocess.send]{@link https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback}
 *
 * Node.js docs about Cluster worker processes:
 *
 * > A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load.
 * >
 * > The cluster module allows easy creation of child processes that all share server ports.
 * >
 * > See example here: [nodejs/docs/cluster/Event:'message']{@link https://nodejs.org/api/cluster.html#event-message}
 *
 * @see `cluster.isPrimary` and `cluster.isWorker` from [nodejs/docs/cluster]{@link https://nodejs.org/api/cluster.html#clusterisprimary}
 * @see `child_process.[fork/spawn] options.stdio` [nodejs/docs/child_process_options_stdio]{@link https://nodejs.org/api/child_process.html#optionsstdio}
 * @see [isNodeJS]{@link isNodeJS}
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 */
export const isNodeJSDependentProcess: boolean = ENVIRONMENT_IS_NODE
    && !!nodeProcess.send
    && !!nodeProcess.disconnect
;

/**
 * Is this code running in nodejs **Worker** environment?
 *
 * If `true`, {@link isNodeJS} will be `true`, {@link isNodeJSMainThread} will be `false`.
 *
 * @see [nodejs/docs/worker_threads/Worker]{@link https://nodejs.org/api/worker_threads.html#class-worker}
 */
export const isNodeJSWorker: boolean = ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_NODE_MAIN_THREAD;

// -----------============================== Deno details ==============================-----------

/**
 * Deno: Next-generation JavaScript Runtime.
 *
 * @see [isDenoMainThread]{@link isDenoMainThread}
 * @see [isDenoWorker]{@link isDenoWorker}
 * @see [isDenoWorkerWithImportScripts]{@link isDenoWorkerWithImportScripts}
 * @see [Deno | Runtime APIs | namespace Deno]{@link https://deno.land/api?s=Deno}
 */
export const isDeno: boolean = ENVIRONMENT_IS_DENO;

/**
 * Is Deno main thread.
 *
 * @see [isDeno]{@link isDeno}
 * @see [isDenoWorker]{@link isDenoWorker}
 * @see [isDenoWorkerWithImportScripts]{@link isDenoWorkerWithImportScripts}
 * @see [Deno | Runtime APIs | namespace Deno]{@link https://deno.land/api?s=Deno}
 *
 * @example Deno result example:
 * {
 *  isMainThread: true,
 *  isDeno: true,
 *  isDenoMainThread: true
 * }
 */
export const isDenoMainThread: boolean = ENVIRONMENT_IS_DENO_MAIN_THREAD;

/**
 * Is [Deno Worker]{@link https://docs.deno.com/runtime/manual/runtime/workers}.
 * Deno supports [`Web Worker API`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker}.
 *
 * @see [isDeno]{@link isDeno}
 * @see [isDenoMainThread]{@link isDenoMainThread}
 * @see [isDenoWorkerWithImportScripts]{@link isDenoWorkerWithImportScripts}
 *
 * @example Deno Worker result example:
 * {
 *   isWorkerThread: true,
 *   isDeno: true,
 *   isDenoWorker: true,
 *   isWebWorker: true,
 *   isWebDedicatedWorker: true
 * }
 */
export const isDenoWorker: boolean = ENVIRONMENT_IS_DENO_WORKER;

/**
 * Is [Deno Worker]{@link https://docs.deno.com/runtime/manual/runtime/workers} with
 * [`importScripts`]{@link https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts}
 * function supports.
 *
 * In Deno, `importScripts` is optional for Worker's.
 *
 * @see [isDeno]{@link isDeno}
 * @see [isDenoMainThread]{@link isDenoMainThread}
 * @see [isDenoWorker]{@link isDenoWorker}
 * @see [Using the "lib" property / "webworker.importscripts"]{@link https://docs.deno.com/runtime/manual/advanced/typescript/configuration#using-the-lib-property}
 */
export const isDenoWorkerWithImportScripts: boolean = ENVIRONMENT_IS_DENO_WORKER_WITH_IMPORT_SCRIPTS;

// -----------============================== Web details ==============================-----------

/**
 * Is this code running in **WEB** environment with such global objects available:
 * * [`window`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window}
 * * [`document`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/document}
 * * [`navigator`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator}

 * In *common cases* this mean this is fully compatible **WEB** environment.
 *
 * If `true`, {@link isNodeJS} may be `true` or `false`.
 */
export const isWebMainThreadCompatible: boolean = ENVIRONMENT_IS_WEB_MAIN_PROCESS_COMPATIBLE;
/**
 * Is this code running in **WEB** environment?
 *
 * If `true`, {@link isNodeJS} will be `false`.
 *
 * @see [isWebDependentWindow]{@link isWebDependentWindow}
 * @see [isWebWorker]{@link isWebWorker}
 * @see [isWebWorklet]{@link isWebWorklet}
 * @see [isWebDedicatedWorker]{@link isWebDedicatedWorker}
 * @see [isWebSharedWorker]{@link isWebSharedWorker}
 * @see [isWebServiceWorker]{@link isWebServiceWorker}
 */
export const isWeb: boolean = ENVIRONMENT_IS_WEB;

/**
 * Is this code running in **WEB** environment and it is a **common web Window** process (**non-Worker** environment)?
 *
 * `true` if positive {@link isWeb}, and negative {@link isWebWorker} and {@link isWebWorklet}.
 *
 * @see [isWebDependentWindow]{@link isWebDependentWindow}
 */
export const isWebMainThread: boolean = ENVIRONMENT_IS_WEB && ENVIRONMENT_IS_MAIN_THREAD;

/**
 * Is this code running in main **WEB** environment in window opened by `window.open` (**dependent window** environment)?
 *
 * @see [isWeb]{@link isWeb}
 * @see [isWebMainThread]{@link isWebMainThread}
 * @see [MDN / window.open]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/open}
 * @see [MDN / window.opener]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/opener}
 */
export const isWebDependentWindow: boolean = ENVIRONMENT_IS_WEB && ENVIRONMENT_IS_MAIN_THREAD
    && !!window.opener
;

/**
 * Is this code running in **Web Worker** environment?
 *
 * If `true`, {@link isWeb} will be `true`.
 *
 * @see [isWebDedicatedWorker]{@link isWebDedicatedWorker}
 * @see [isWebSharedWorker]{@link isWebSharedWorker}
 * @see [isWebServiceWorker]{@link isWebServiceWorker}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [Live WebWorker Example]{@link https://mdn.github.io/simple-web-worker/}
 */
export const isWebWorker: boolean = ENVIRONMENT_IS_WEB_WORKER;

/**
 * Is this code running in **DedicatedWorker** environment?
 *
 * If `true`,  {@link isWebWorker} will be `true` and {@link isWeb} will be `true`.
 *
 * @see [MDN / DedicatedWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorker}
 * @see [MDN / DedicatedWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export const isWebDedicatedWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof DedicatedWorkerGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && (/** @type {import("typescript/lib/lib.webworker").DedicatedWorkerGlobalScope} */_global) instanceof DedicatedWorkerGlobalScope
;

/**
 * Is this code running in **SharedWorker** environment?
 *
 * If `true`,  {@link isWebWorker} will be `true` and {@link isWeb} will be `true`.
 *
 * @see [MDN / SharedWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker}
 * @see [MDN / SharedWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/SharedWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [lib.webworker.d.ts]{@link ../node_modules/typescript/lib/lib.webworker.d.ts}
 */
export const isWebSharedWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof SharedWorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").SharedWorkerGlobalScope} */_global)["onconnect"] !== 'undefined'
;

/**
 * Is this code running in **ServiceWorker** environment?
 *
 * If `true`,  {@link isWebWorker} will be `true` and {@link isWeb} will be `true`.
 *
 * @see [MDN / ServiceWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker}
 * @see [MDN / ServiceWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export const isWebServiceWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof ServiceWorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").ServiceWorkerGlobalScope} */_global)["skipWaiting"] === 'function'
;

// -----------============================== Web Worklet's details ==============================-----------

/**
 * Is this code running in **Web Worklet** environment?
 *
 * If {@link isWebWorklet} = `true`, {@link isWeb} always will be `true`.
 *
 * @see [isWebPaintWorklet]{@link isWebPaintWorklet}
 * @see [isWebAudioWorklet]{@link isWebAudioWorklet}
 * @see [MDN / Worklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/Worklet}
 * @see [whatwg / HTML spec / Worklets]{@link https://html.spec.whatwg.org/multipage/worklets.html}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [Live WebWorker Example]{@link https://mdn.github.io/simple-web-worker/}
 * @see [HTML Living Standard / WorkletGlobalScope]{@link https://html.spec.whatwg.org/multipage/worklets.html#workletglobalscope}
 */
export const isWebWorklet: boolean = ENVIRONMENT_IS_WEB_WORKLED;

/**
 * Is this code running in **PaintWorklet** environment?
 *
 * If {@link isWebAudioWorklet} = `true`,  {@link isWebWorklet} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see [isWebWorklet]{@link isWebWorklet}
 * @see [MDN / PaintWorklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/PaintWorklet}
 * @see [MDN / PaintWorkletGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/PaintWorkletGlobalScope}
 * @see [MDN / CSS Painting API]{@link https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API}
 * @see [MDN / Using the CSS Painting API]{@link https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API/Guide}
 * @see [CSS Painting API Level 1 / Paint Worklet]{@link https://www.w3.org/TR/css-paint-api-1/#paint-worklet}
 */
export const isWebPaintWorklet: boolean = ENVIRONMENT_IS_WEB_WORKLED
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof PaintWorkletGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof (_global as PaintWorkletGlobalScope).registerPaint === 'function'
;

/**
 * Is this code running in **AudioWorklet** environment?
 *
 * If {@link isWebAudioWorklet} = `true`,  {@link isWebWorklet} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see [isWebWorklet]{@link isWebWorklet}
 * @see [MDN / AudioWorklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet}
 * @see [MDN / AudioWorkletGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope}
 * @see [MDN / Web Audio API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API}
 * @see [MDN / Using the Web Audio API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API}
 * @see [MDN / Background audio processing using AudioWorklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet}
 * @see [Web Audio API / The AudioWorklet Interface]{@link https://www.w3.org/TR/webaudio/#AudioWorklet}
 * @see [Audio Worklet Examples]{@link https://googlechromelabs.github.io/web-audio-samples/audio-worklet/}
 */
export const isWebAudioWorklet: boolean = ENVIRONMENT_IS_WEB_WORKLED
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof AudioWorkletGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    && typeof (_global as AudioWorkletGlobalScope).registerProcessor === 'function'
;

// todo:
//  - AnimationWorklet: https://wicg.github.io/animation-worklet/
//  - LayoutWorklet: https://drafts.css-houdini.org/css-layout-api-1/#layout-worklet

// -----------============================== Cordova details ==============================-----------

/**
 * Is this code running in any Cordova environment?
 *
 * @see [Documentation - Apache Cordova]{@link https://cordova.apache.org/docs/en/latest/}
 */
export const isCordova =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    typeof cordova === "object"
;

// -----------============================== NW.js details ==============================-----------

/**
 * NW.js lets you call all Node.js modules directly from DOM and enables a new way of writing applications
 * with all Web technologies. It was previously known as “node-webkit” project.
 *
 * Note that {@link isWebMainThreadCompatible} will be also `true` if this NWJS window is include Web context.
 *
 * @see [NW.js Main page]{@link https://nwjs.io/}
 * @see [NW.js Documentation]{@link https://docs.nwjs.io/en/latest/}
 *
 * @example nwjs result example:
 * {
 *   isMainThread: true,
 *   isNWJSMixedContextWindow: true,
 *   isNodeJS: true,
 *   isNodeJSMainThread: true,
 *   isWebMainThreadCompatible: true
 * }
 */
export const isNWJSMixedContextWindow = ENVIRONMENT_IS_NWJS;

// todo: nwjs background process detection?

// -----------============================== Electron details ==============================-----------

/**
 * Is this code running in any Electron environment?
 *
 * [Electron Documentation]{@link https://www.electronjs.org/docs/}
 *
 * * For Main process: {@link isElectronMain} = `true`
 * * For Renderer process: {@link isElectronRenderer} = `true`
 * * For WebWorker: {@link isWebWorker} = `true`
 * * Check node integration by {@link isElectronNodeIntegration}
 *
 * @see [isElectronMain]{@link isElectronMain}
 * @see [isElectronRenderer]{@link isElectronRenderer}
 * @see [isElectronNodeIntegration]{@link isElectronNodeIntegration}
 * @see [electronjs/docs/process.type]{@link https://www.electronjs.org/docs/latest/api/process#processtype-readonly}
 **/
export const isElectron: boolean = ENVIRONMENT_IS_ELECTRON;

/**
 * Is this is [main Electron process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process}?
 *
 * Electron Glossary: [main process]{@link https://www.electronjs.org/docs/latest/glossary#main-process}
 *
 * The main process, commonly a file named `main.js`, is the entry point to every Electron app. It controls the life of
 * the app, from open to close. It also manages native elements such as the Menu, Menu Bar, Dock, Tray, etc. The main
 * process is responsible for creating each new renderer process in the app. The full Node API is built in.
 *
 * Every app's main process file is specified in the `main` property in `package.json`. This is how `electron .` knows
 * what file to execute at startup.
 *
 * In Chromium, this process is referred to as the "browser process". It is renamed in Electron to avoid confusion with renderer processes.
 *
 * @see [electronjs/docs/Process Model#The main process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process}
 * @see [electronjs/docs/Glossary/main process]{@link https://www.electronjs.org/docs/latest/glossary#main-process}
 * @see [electronjs/docs/Quick Start]{@link https://www.electronjs.org/docs/latest/tutorial/quick-start}
 * @see [electronjs/docs/process.isMainFrame]{@link https://www.electronjs.org/docs/latest/api/process#processismainframe-readonly}
 **/
export const isElectronMain = ELECTRON_ENV === ELECTRON__MAIN;

/**
 * Is this is [Renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * of [browser Window]{@link https://www.electronjs.org/docs/latest/api/browser-window}
 * in Electron app?
 *
 * Electron Glossary: [renderer process]{@link https://www.electronjs.org/docs/latest/glossary#renderer-process}
 *
 * Note that it can be Renderer process without node integration: {@link isElectronRenderer} = `true` and {@link isElectronNodeIntegration} = `false`.
 *
 * The renderer process is a browser window in your app. Unlike the main process, there can be multiple of these and
 * each is run in a separate process. They can also be hidden.
 *
 * In normal browsers, web pages usually run in a sandboxed environment and are not allowed access to native resources.
 * Electron users, however, have the power to use Node.js APIs in web pages allowing lower level operating system
 * interactions.
 *
 * @see [electronjs/docs/Process Model#The renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * @see [electronjs/docs/Glossary/renderer process]{@link https://www.electronjs.org/docs/latest/glossary#renderer-process}
 * @see [electronjs/docs/Quick Start]{@link https://www.electronjs.org/docs/latest/tutorial/quick-start}
 **/
export const isElectronRenderer: boolean = ELECTRON_ENV === ELECTRON__RENDERER_WITH_NODE_INTEGRATION
    // Determine Electron Renderer process by circumstantial evidence. We assume, if it's WebWorker, it can't be a Renderer process.
    || (ELECTRON_ENV === ELECTRON__NO_NODE_INTEGRATION && !ENVIRONMENT_IS_WEB_WORKER)
;

/**
 * Is this is [Preload scripts]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts}
 * of [Renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * of [browser Window]{@link https://www.electronjs.org/docs/latest/api/browser-window}
 * in Electron app?
 *
 * You can use this value to check if `contextBridge` API is enable (or you can use `process.contextIsolated`).
 * <br />Error example: `contextBridge API can only be used when contextIsolation is enabled`.
 *
 * ---
 *
 * Note: With `{ webPreferences: { nodeIntegrationInWorker: true, contextIsolation: false } }` we can't detect preload
 * process, so this value always be `false` even executing in `preload.js` file.
 *
 * @see [electronjs/docs/Process Model#Preload scripts]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts}
 * @see [electronjs/docs/Understanding context-isolated processes]{@link https://www.electronjs.org/docs/latest/tutorial/ipc#understanding-context-isolated-processes}
 * @see [electronjs/docs/Context Isolation]{@link https://www.electronjs.org/docs/latest/tutorial/context-isolation}
 * @see [electronjs/docs/process.contextIsolated]{@link https://www.electronjs.org/docs/latest/api/process#processcontextisolated-readonly}
 */
export const isElectronRendererPreload: boolean = ELECTRON_ENV === ELECTRON__RENDERER_WITH_NODE_INTEGRATION
    && !ENVIRONMENT_IS_WEB
    && _toString.call(window) === '[object global]'
;

/**
 * Is it Electron process with node integration? One of case should be `true`:
 * - It's [Electron Main process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process}.
 * In this case: {@link isElectronMain} = `true`.
 * - It's [Electron Renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * with `nodeIntegration==true` and `contextIsolation==false`. In this case: {@link isElectronMain} = `false`, {@link isElectronRenderer} = `true`.
 * - It's [WebWorker]{@link https://www.electronjs.org/docs/latest/tutorial/multithreading}
 * running in Electron app with `nodeIntegrationInWorker==true` and `contextIsolation==false`.
 * In this case: {@link isElectronMain} = `false` and {@link isElectronRenderer} = `false`, and  {@link isElectron} = `true`, and {@link isWebWorker} = `true`.
 *
 *
 * @example opening a new window with node integration:
```
 // https://www.electronjs.org/docs/latest/api/browser-window
var win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,// It's false by default
    contextIsolation: false,// It's true by default
  },
});
win.loadURL('http://google.com');
win.show();
```
 * @example opening a new window and running WebWorker on it (without code for Worker running):
```
 // https://www.electronjs.org/docs/latest/api/browser-window
var win = new BrowserWindow({
  webPreferences: {
    nodeIntegrationInWorker: true,// It's false by default
    contextIsolation: false,// It's true by default
  },
});
win.loadURL('https://www.html5rocks.com/en/tutorials/workers/basics/');
win.show();
 // ...running WebWorker on page...
```
 * @see [electronjs/docs/Tag Attributes/nodeintegration]{@link https://www.electronjs.org/docs/latest/api/webview-tag#nodeintegration}
 * @see [electronjs/docs/Tag Attributes/nodeintegrationinsubframes]{@link https://www.electronjs.org/docs/latest/api/webview-tag#nodeintegrationinsubframes}
 * @see [electronjs/docs/new BrowserWindow(options: { webPreferences })/nodeIntegration, nodeIntegrationInWorker, nodeIntegrationInSubFrames]{@link https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions}
 * @see [Changing the defaults for nodeIntegration and contextIsolation to improve the default security posture of Electron applications]{@link https://github.com/electron/electron/issues/23506}
 */
export const isElectronNodeIntegration: boolean = ENVIRONMENT_IS_ELECTRON
    && ELECTRON_ENV !== ELECTRON__NO_NODE_INTEGRATION
;

// todo: isElectronRendererSandboxed
//  https://www.electronjs.org/docs/latest/tutorial/sandbox
//  > Preload scripts
//  > In order to allow renderer processes to communicate with the main process, preload scripts attached to sandboxed
//  > renderers will still have a polyfilled subset of Node.js APIs available. A require function similar to Node's
//  > require module is exposed, but can only import a subset of Electron and Node's built-in modules:
//  > electron (only renderer process modules), events, timers, url

// -----------============================== ReactNative details ==============================-----------

export const isReactNative: boolean = ENVIRONMENT_IS_REACT_NATIVE;

// -----------============================== JSDON details ==============================-----------

/**
 * jsdom is a pure-JavaScript implementation of many web standards, notably the WHATWG DOM and HTML Standards, for use
 * with Node.js. In general, the goal of the project is to emulate enough of a subset of a web browser to be useful
 * for testing and scraping real-world web applications.
 *
 * @see [jsdom githib]{@link https://github.com/jsdom/jsdom#readme}
 */
export const isJSDOM: boolean = ENVIRONMENT_IS_JSDOM;

// -----------============================== Some detailed info (can be used for debug) ==============================-----------

const _envDetails = {
    isMainThread,
    isWorkerThread,

    isNodeJS,
    isNodeJSMainThread,
    isNodeJSDependentProcess,
    isNodeJSWorker,

    isDeno,
    isDenoMainThread,
    isDenoWorker,
    isDenoWorkerWithImportScripts,

    isWeb,
    isWebMainThread,
    isWebMainThreadCompatible,
    isWebDependentWindow,
    isWebWorker,
    isWebDedicatedWorker,
    isWebSharedWorker,
    isWebServiceWorker,
    isWebWorklet,
    isWebPaintWorklet,
    isWebAudioWorklet,

    isCordova,

    isNWJSMixedContextWindow,

    isElectron,
    isElectronMain,
    isElectronRenderer,
    isElectronRendererPreload,
    isElectronNodeIntegration,

    isReactNative,

    isJSDOM,
};

export type IEnvDetailsFull = typeof _envDetails;
export type IEnvDetails = Partial<typeof _envDetails>;
export type IEnvDetailsKeys = (keyof(typeof _envDetails))[];

export const envDetails: IEnvDetails = Object.keys(_envDetails).reduce((_envDetails, key) => {
    if (!_envDetails[key]) {
        delete _envDetails[key];
    }

    return _envDetails;
}, { ..._envDetails });

export const envDetailsFull: IEnvDetailsFull = _envDetails;
