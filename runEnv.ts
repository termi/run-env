'use strict';

// https://stackoverflow.com/a/23619712
// https://github.com/emscripten-core/emscripten/blob/54b0f19d9e8130de16053b0915d114c346c99f17/src/shell.js
// var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
// var ENVIRONMENT_IS_WEB = typeof window === 'object';
// var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

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
const ENVIRONMENT_IS_WEB_WORKER_NODE_INTEGRATION = ELECTRON_ENV === ELECTRON__WEB_WORKER_NODE_INTEGRATION;
const ENVIRONMENT_IS_WEB_MAIN_PROCESS = typeof window === 'object';
let ENVIRONMENT_IS_NODE = false;
let ENVIRONMENT_IS_NODE_MAIN_THREAD = false;

if (_IS_PROCESS && typeof require === 'function') {
    // Don't get fooled by e.g. browserify environments.
    ENVIRONMENT_IS_NODE = {}.toString.call(process) === "[object process]";

    if (ENVIRONMENT_IS_NODE) {
        // Maybe this is Node.js
        if (_IS_WINDOW) {
            if (ENVIRONMENT_IS_ELECTRON) {
                // this is Electron process.
                //  isNodeJS = true for Main Electron process
                //  isNodeJS = false for Renderer or without node integration processes
                ENVIRONMENT_IS_NODE = ELECTRON_ENV === ELECTRON__MAIN;
            }
            else if (window["__fake__"]) {
                // (jsdom is used automatically)[https://github.com/facebook/jest/issues/3692#issuecomment-304945928]
                // workaround for jest+JSDOM
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

                if (isJasmine) {
                    ENVIRONMENT_IS_NODE = true;
                }
            }
            else {
                ENVIRONMENT_IS_NODE = false;
            }
        }
        else if (ENVIRONMENT_IS_WEB_WORKER_NODE_INTEGRATION) {
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
            const worker_threads = require('worker_threads');

            if (worker_threads && typeof worker_threads["isMainThread"] === 'boolean') {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = worker_threads["isMainThread"];
            }
            else {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
            }
        }
        catch(e) {
            // old nodejs without Worker's support
            ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
        }
    }
}

const ENVIRONMENT_IS_WEB_WORKER = !ENVIRONMENT_IS_NODE
    && typeof globalThis["importScripts"] === 'function'
    && !_IS_DOCUMENT
;
// Based on https://stackoverflow.com/a/39473604
// todo: Как выставлять isWeb для ReactNative: в true или в false? Нужно понять, как для ReactNative пишется код и
//   совместим ли он с кодом для "обычного" Web'а.
const ENVIRONMENT_IS_REACT_NATIVE = !_IS_DOCUMENT && _IS_NAVIGATOR && navigator.product == 'ReactNative';

// ===========================================================================================
// -----------============================== exports ==============================-----------
// ===========================================================================================

/** isMainThread for browser and nodejs */
export const isMainThread = ENVIRONMENT_IS_NODE ? ENVIRONMENT_IS_NODE_MAIN_THREAD : !ENVIRONMENT_IS_WEB_WORKER;

/** isWorkerThread for browser and nodejs */
export const isWorkerThread = ENVIRONMENT_IS_NODE ? !ENVIRONMENT_IS_NODE_MAIN_THREAD : ENVIRONMENT_IS_WEB_WORKER;

/** Is this code running in nodejs environment? */
export const isNodeJS = ENVIRONMENT_IS_NODE;

/**
 * Is this code running in nodejs Worker environment?
 *
 * If {@link isNodeJSWorker} = `true`, {@link isNodeJS} always will be `true`.
 *
 * @see {@link https://nodejs.org/api/worker_threads.html#worker_threads_class_worker}
 */
export const isNodeJSWorker = ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_NODE_MAIN_THREAD;

/** Is this code running in WEB environment? */
export const isWeb = !ENVIRONMENT_IS_NODE && (ENVIRONMENT_IS_WEB_MAIN_PROCESS || ENVIRONMENT_IS_WEB_WORKER);

/**
 * Is this code running in WebWorker environment?
 *
 * If {@link isWebWorker} = `true`, {@link isWeb} always will be `true`.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export const isWebWorker = ENVIRONMENT_IS_WEB_WORKER;

/**
 * Is this code running in any Electron environment?
 *
 * [Electron Documentation]{@link https://www.electronjs.org/docs/}
 *
 * * For Main process: {@link isElectronMain} = `true`
 * * For Renderer process: {@link isElectronRenderer} = `true`
 * * For WebWorker: {@link isWebWorker} = `true`
 * * Check node integration by {@link isElectronNodeIntegration}
 **/
export const isElectron = ENVIRONMENT_IS_ELECTRON;

/**
 * Is this is main Electron process?
 *
 * [main process]{@link https://www.electronjs.org/docs/glossary#main-process}
 *
 * The main process, commonly a file named `main.js`, is the entry point to every Electron app. It controls the life of
 * the app, from open to close. It also manages native elements such as the Menu, Menu Bar, Dock, Tray, etc. The main
 * process is responsible for creating each new renderer process in the app. The full Node API is built in.
 *
 * Every app's main process file is specified in the `main` property in `package.json`. This is how `electron .` knows
 * what file to execute at startup.
 *
 * In Chromium, this process is referred to as the "browser process". It is renamed in Electron to avoid confusion with renderer processes.
 **/
export const isElectronMain = ELECTRON_ENV === ELECTRON__MAIN;

/**
 * Is this is Renderer process of browser Window in Electron app?
 *
 * Note that it can be Renderer process without node integration: {@link isElectronRenderer} = `true` and {@link isElectronNodeIntegration} = `false`.
 *
 * [renderer process]{@link https://www.electronjs.org/docs/glossary#renderer-process}
 *
 * The renderer process is a browser window in your app. Unlike the main process, there can be multiple of these and
 * each is run in a separate process. They can also be hidden.
 *
 * In normal browsers, web pages usually run in a sandboxed environment and are not allowed access to native resources.
 * Electron users, however, have the power to use Node.js APIs in web pages allowing lower level operating system
 * interactions.
 **/
export const isElectronRenderer = ELECTRON_ENV === ELECTRON__RENDERER
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
 */
export const isElectronNodeIntegration = ENVIRONMENT_IS_ELECTRON && ELECTRON_ENV !== ELECTRON__NO_NODE_INTEGRATION;

export const isReactNative = ENVIRONMENT_IS_REACT_NATIVE;
