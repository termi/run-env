'use strict';

// https://stackoverflow.com/a/23619712
// https://github.com/emscripten-core/emscripten/blob/54b0f19d9e8130de16053b0915d114c346c99f17/src/shell.js
// var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
// var ENVIRONMENT_IS_WEB = typeof window === 'object';
// var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// see also https://github.com/foo123/asynchronous.js/blob/master/asynchronous.js
// see also https://github.com/iliakan/detect-node

const _IS_PROCESS = typeof process !== 'undefined';
const _IS_WINDOW = typeof window !== 'undefined';
const _IS_DOCUMENT = typeof document !== 'undefined';
const _IS_NAVIGATOR = typeof navigator === 'object';

const ELECTRON__MAIN = 1;
const ELECTRON__RENDERER = 2;
const ELECTRON__NO_NODE_INTEGRATION = 3;
const ELECTRON__WEB_WORKER_NODE_INTEGRATION = 4;

// https://github.com/electron/electron/issues/2288
function getElectronEnv() {
    // Renderer process
    // en: https://www.electronjs.org/docs/api/process#processtype-readonly
    // ru: https://www.electronjs.org/docs/api/process#processtype-%D1%82%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%87%D1%82%D0%B5%D0%BD%D0%B8%D0%B5
    // process.type: A String representing the current process's type, can be:
    // * browser - The main process
    // * renderer - A renderer process
    // * worker - In a web worker
    if (_IS_WINDOW && typeof window.process === 'object' && window.process["type"] === 'renderer') {
        return ELECTRON__RENDERER;
    }

    // Main process
    if (_IS_PROCESS && typeof process.versions === 'object' && !!process.versions.electron) {
        // For
        // ```
        // const win = new BrowserWindow({ webPreferences: { nodeIntegrationInWorker: true } });
        // ```
        // process.type should be 'worker'
        return process["type"] === 'worker' ? ELECTRON__WEB_WORKER_NODE_INTEGRATION : ELECTRON__MAIN;
    }

    // Detect the user agent when the `nodeIntegration` option is set to false
    if (_IS_NAVIGATOR && typeof navigator["userAgent"] === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        return ELECTRON__NO_NODE_INTEGRATION;
    }

    return 0;
}

const ELECTRON_ENV = getElectronEnv();
const ENVIRONMENT_IS_ELECTRON = ELECTRON_ENV !== 0;
const ENVIRONMENT_IS_ELECTRON_WEB_WORKER_NODE_INTEGRATION = ELECTRON_ENV === ELECTRON__WEB_WORKER_NODE_INTEGRATION;

let ENVIRONMENT_IS_NODE = false;
let ENVIRONMENT_IS_NODE_MAIN_THREAD = false;

if (_IS_PROCESS) {
    // Don't get fooled by e.g. browserify environments.
    // Only Node.JS has a process variable that is of [[Class]] process
    ENVIRONMENT_IS_NODE = Object.prototype.toString.call(process) === "[object process]"
        // if the checks above will not be enough:
        // && typeof require === 'function'
        // && Object.prototype.toString.call(globalThis) === "[object global]"
        // // from https://github.com/realm/realm-js/blob/992392e477cb2f5b059b21f6f04edb5f5e7073c2/packages/realm-network-transport/src/NetworkTransport.ts#L24
        // && "node" in process.versions
    ;

    if (ENVIRONMENT_IS_NODE) {// Maybe this is Node.js
        if (_IS_WINDOW) {
            if (ENVIRONMENT_IS_ELECTRON) {
                // this is Electron process.
                //  isNodeJS = true for Main Electron process
                //  isNodeJS = false for Renderer or without node integration processes
                ENVIRONMENT_IS_NODE = ELECTRON_ENV === ELECTRON__MAIN;
            }
            else if (!String(window.print).includes('[native code]')) {
                // This is workaround for jest+JSDOM due jsdom is used automatically (https://github.com/facebook/jest/issues/3692#issuecomment-304945928)
                ENVIRONMENT_IS_NODE = true;
            }
            else if (window["jasmine"]) {
                // jest/jasmine tests environment
                const keys = ['describe', 'xdescribe', 'it', 'xit', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'test', 'xtest', 'expect'];
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
        else if (process["browser"]) {
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
            // Hide require from "rollup", "webpack" and it's friends
            const worker_threads = (new Function('return req' + 'uire("worker_threads")')());

            if (worker_threads && typeof worker_threads["isMainThread"] === 'boolean') {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = (worker_threads as typeof import("worker_threads")).isMainThread;
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

const ENVIRONMENT_IS_WEB_MAIN_PROCESS = !ENVIRONMENT_IS_NODE && typeof window === 'object' && globalThis === window;
const ENVIRONMENT_IS_WEB_WORKER = !ENVIRONMENT_IS_NODE
    && typeof (/** @type {import("typescript/lib/lib.webworker").WorkerGlobalScope} */globalThis)["importScripts"] === 'function'
    && !_IS_DOCUMENT
    && _IS_NAVIGATOR
    // Can't <reference lib="webworker" /> due error like:
    // `TS2403: Subsequent variable declarations must have the same type. Variable 'location' must be of type 'Location', but here has type 'WorkerLocation'.  lib.dom.d.ts(19615, 13): 'location' was also declared here.`
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof WorkerNavigator !== 'undefined' && (/** @type {import("typescript/lib/lib.webworker").WorkerNavigator} */navigator) instanceof WorkerNavigator
    // && typeof globalThis.onmessage !== 'undefined'
;
// Based on https://stackoverflow.com/a/39473604
// todo: Как выставлять isWeb для ReactNative: в true или в false? Нужно понять, как для ReactNative пишется код и
//   совместим ли он с кодом для "обычного" Web'а.
const ENVIRONMENT_IS_REACT_NATIVE = !_IS_DOCUMENT && _IS_NAVIGATOR && navigator.product == 'ReactNative';

// ===========================================================================================
// -----------============================== exports ==============================-----------
// ===========================================================================================

/**
 * isMainThread for browser and nodejs. `true` if negative {@link isNodeJSWorker} or {@link isWebWorker}.
 *
 * @see {@link isNodeJSWorker}
 * @see {@link isWebWorker}
 */
export const isMainThread: boolean = ENVIRONMENT_IS_NODE ? ENVIRONMENT_IS_NODE_MAIN_THREAD : !ENVIRONMENT_IS_WEB_WORKER;

/**
 * isWorkerThread for browser and nodejs. `true` if positive {@link isNodeJSWorker} or {@link isWebWorker}.
 *
 * @see {@link isNodeJSWorker}
 * @see {@link isWebWorker}
 */
export const isWorkerThread: boolean = ENVIRONMENT_IS_NODE ? !ENVIRONMENT_IS_NODE_MAIN_THREAD : ENVIRONMENT_IS_WEB_WORKER;

// -----------============================== NodeJS details ==============================-----------

/**
 * Is this code running in nodejs environment?
 *
 * @see {@link isNodeJSDependentProcess}
 * @see {@link isNodeJSWorker}
 */
export const isNodeJS: boolean = ENVIRONMENT_IS_NODE;

// Also, `process.env.NODE_UNIQUE_ID` will have value for subprocess forked with `cluster` module
//  https://nodejs.org/api/cluster.html#cluster_cluster_isprimary
//  cluster.isPrimary: True if the process is a primary. This is determined by the process.env.NODE_UNIQUE_ID. If process.env.NODE_UNIQUE_ID is undefined, then isPrimary is true.
// Also see https://www.npmjs.com/package/node-ipc
/**
 * Node.js process is spawned with an IPC channel (see the [Child Process]{@link https://nodejs.org/api/child_process.html}
 * and [Cluster]{@link https://nodejs.org/api/cluster.html} documentation).
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
 * > Accessing the IPC channel fd in any way other than [process.send()](https://nodejs.org/api/process.html#process_process_send_message_sendhandle_options_callback)
 * > or using the IPC channel with a child process that is not a Node.js instance is not supported.
 * >
 * > See example here: [nodejs/docs/child_process/subprocess.send]{@link https://nodejs.org/api/child_process.html#child_process_subprocess_send_message_sendhandle_options_callback}
 *
 * Node.js docs about Cluster worker processes:
 *
 * > A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load.
 * >
 * > The cluster module allows easy creation of child processes that all share server ports.
 * >
 * > See example here: [nodejs/docs/cluster/Event:'message']{@link https://nodejs.org/api/cluster.html#cluster_event_message}
 *
 * @see `cluster.isPrimary` and `cluster.isWorker` from [nodejs/docs/cluster]{@link https://nodejs.org/api/cluster.html#cluster_cluster_isprimary}
 * @see `child_process.[fork/spawn] options.stdio` [nodejs/docs/child_process_options_stdio]{@link https://nodejs.org/api/child_process.html#child_process_options_stdio}
 */
export const isNodeJSDependentProcess: boolean = ENVIRONMENT_IS_NODE
    && !!process.send
    && !!process.disconnect
;

/**
 * Is this code running in nodejs Worker environment?
 *
 * If {@link isNodeJSWorker} = `true`, {@link isNodeJS} always will be `true`.
 *
 * @see {@link https://nodejs.org/api/worker_threads.html#worker_threads_class_worker}
 */
export const isNodeJSWorker: boolean = ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_NODE_MAIN_THREAD;

// -----------============================== Web details ==============================-----------

/**
 * Is this code running in WEB environment?
 *
 * @see {@link isWebDependentWindow}
 * @see {@link isWebWorker}
 * @see {@link isWebDedicatedWorker}
 * @see {@link isWebSharedWorker}
 * @see {@link isWebServiceWorker}
 */
export const isWeb: boolean = ENVIRONMENT_IS_WEB_MAIN_PROCESS || ENVIRONMENT_IS_WEB_WORKER;

/**
 * Is this code running in WEB environment in window opened by `window.open`?
 *
 * @see [window.open]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/open}
 * @see [window.opener]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/opener}
 */
export const isWebDependentWindow: boolean = ENVIRONMENT_IS_WEB_MAIN_PROCESS
    && !!window.opener
;

/**
 * Is this code running in WebWorker environment?
 *
 * If {@link isWebWorker} = `true`, {@link isWeb} always will be `true`.
 *
 * @see {@link isWebDedicatedWorker}
 * @see {@link isWebSharedWorker}
 * @see {@link isWebServiceWorker}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [Live WebWorker Example]{@link https://mdn.github.io/simple-web-worker/}
 */
export const isWebWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof WorkerGlobalScope !== 'undefined'
;

/**
 * Is this code running in DedicatedWorker environment?
 *
 * If {@link isWebDedicatedWorker} = `true`,  {@link isWebWorker} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see {@link isWebWorker}
 * @see [MDN / DedicatedWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorker}
 * @see [MDN / DedicatedWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export const isWebDedicatedWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof DedicatedWorkerGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && (/** @type {import("typescript/lib/lib.webworker").DedicatedWorkerGlobalScope} */globalThis) instanceof DedicatedWorkerGlobalScope
;

/**
 * Is this code running in SharedWorker environment?
 *
 * If {@link isWebSharedWorker} = `true`,  {@link isWebWorker} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see {@link isWebWorker}
 * @see [MDN / SharedWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker}
 * @see [MDN / SharedWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/SharedWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see {@link ../node_modules/typescript/lib/lib.webworker.d.ts}
 */
export const isWebSharedWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof SharedWorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").SharedWorkerGlobalScope} */globalThis)["onconnect"] !== 'undefined'
;

/**
 * Is this code running in ServiceWorker environment?
 *
 * If {@link isWebServiceWorker} = `true`,  {@link isWebWorker} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see {@link isWebWorker}
 * @see [MDN / ServiceWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker}
 * @see [MDN / ServiceWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export const isWebServiceWorker: boolean = ENVIRONMENT_IS_WEB_WORKER
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof ServiceWorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").ServiceWorkerGlobalScope} */globalThis)["skipWaiting"] === 'function'
;

// -----------============================== Cordova details ==============================-----------

/**
 * Is this code running in any Cordova environment?
 *
 * @see {@link https://cordova.apache.org/docs/en/latest/}
 */
export const isCordova =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    typeof cordova === "object"
;

/*
// -----------============================== NW.js details ==============================-----------

// https://nwjs.io/
export const isNwjsMainProcess = ENVIRONMENT_IS_NODE
    && (function() {
        try {
            return typeof require('nw.gui') !== 'undefined';
        }
        catch (e) {
            return false;
        }
    })()
;
*/

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
 * @see {@link isElectronMain}
 * @see {@link isElectronRenderer}
 * @see {@link isElectronNodeIntegration}
 * @see [electronjs/docs/process.type]{@link https://www.electronjs.org/docs/api/process#processtype-readonly}
 **/
export const isElectron: boolean = ENVIRONMENT_IS_ELECTRON;

/**
 * Is this is main Electron process?
 *
 * Electron Glossary: [main process]{@link https://www.electronjs.org/docs/glossary#main-process}
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
 * @see [electronjs/docs/Glossary/main process]{@link https://www.electronjs.org/docs/glossary#main-process}
 * @see [electronjs/docs/Main and Renderer Processes]{@link https://www.electronjs.org/docs/tutorial/quick-start#main-and-renderer-processes}
 * @see [electronjs/docs/process.isMainFrame]{@link https://www.electronjs.org/docs/api/process#processismainframe-readonly}
 **/
export const isElectronMain = ELECTRON_ENV === ELECTRON__MAIN;

/**
 * Is this is Renderer process of browser Window in Electron app?
 *
 * Electron Glossary: [renderer process]{@link https://www.electronjs.org/docs/glossary#renderer-process}
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
 * @see [electronjs/docs/Glossary/renderer process]{@link https://www.electronjs.org/docs/glossary#renderer-process}
 * @see [electronjs/docs/Main and Renderer Processes]{@link https://www.electronjs.org/docs/tutorial/quick-start#main-and-renderer-processes}
 **/
export const isElectronRenderer: boolean = ELECTRON_ENV === ELECTRON__RENDERER
    // Determine Electron Renderer process by circumstantial evidence. We assume, if it's WebWorker, it can't be a Renderer process.
    || (ELECTRON_ENV === ELECTRON__NO_NODE_INTEGRATION && !ENVIRONMENT_IS_WEB_WORKER)
;

/**
 * Is it Electron process with node integration? One of for `true`:
 * - It's Electron Main process. In this case: {@link isElectronMain} = `true`.
 * - It's Electron Renderer process with `nodeIntegration=true`. In this case: {@link isElectronMain} = `false`, {@link isElectronRenderer} = `true`.
 * - It's WebWorker running in Electron app with `nodeIntegrationInWorker=true`.
 * In this case: {@link isElectronMain} = `false` and {@link isElectronRenderer} = `false`, and  {@link isElectron} = `true`, and {@link isWebWorker} = `true`.
 *
 *
 * @example opening a new window with node integration:
```
 // https://www.electronjs.org/docs/api/browser-window
var win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,// It's false by default
  },
});
win.loadURL('http://google.com');
win.show();
```
 * @example opening a new window and running WebWorker on it (without code for Worker running):
```
 // https://www.electronjs.org/docs/api/browser-window
var win = new BrowserWindow({
  webPreferences: {
    nodeIntegrationInWorker: true,// It's false by default
  },
});
win.loadURL('https://www.html5rocks.com/en/tutorials/workers/basics/');
win.show();
 // ...running WebWorker on page...
```
 * @see [electronjs/docs/Tag Attributes/nodeintegration]{@link https://www.electronjs.org/docs/api/webview-tag#nodeintegration}
 * @see [electronjs/docs/Tag Attributes/nodeintegrationinsubframes]{@link https://www.electronjs.org/docs/api/webview-tag#nodeintegrationinsubframes}
 * @see [electronjs/docs/new BrowserWindow(options: { webPreferences })/nodeIntegration, nodeIntegrationInWorker, nodeIntegrationInSubFrames]{@link https://www.electronjs.org/docs/api/browser-window#new-browserwindowoptions}
 */
export const isElectronNodeIntegration: boolean = ENVIRONMENT_IS_ELECTRON
    && ELECTRON_ENV !== ELECTRON__NO_NODE_INTEGRATION
;

// -----------============================== ReactNative details ==============================-----------

export const isReactNative: boolean = ENVIRONMENT_IS_REACT_NATIVE;
