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

const _IS_PROCESS = typeof process !== 'undefined';
const _IS_WINDOW = typeof window !== 'undefined';
const _IS_DOCUMENT = typeof document !== 'undefined';
const _IS_NAVIGATOR = typeof navigator === 'object';
const _toString = Object.prototype.toString;

const ELECTRON__MAIN = 1;
const ELECTRON__RENDERER_WITH_NODE_INTEGRATION = 2;
const ELECTRON__NO_NODE_INTEGRATION = 3;
const ELECTRON__WEB_WORKER_NODE_INTEGRATION = 4;

// https://github.com/electron/electron/issues/2288
// see also: https://github.com/cheton/is-electron/
function getElectronEnv() {
    // Renderer process
    // en: https://www.electronjs.org/docs/latest/api/process#processtype-readonly
    // ru: https://www.electronjs.org/ru/docs/latest/api/process#processtype-%D1%82%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%87%D1%82%D0%B5%D0%BD%D0%B8%D0%B5
    // process.type: A String representing the current process's type, can be:
    // * browser - The main process
    // * renderer - A renderer process
    // * worker - In a web worker
    if (_IS_WINDOW && typeof window.process === 'object' && !!window.process && window.process["type"] === 'renderer') {
        return ELECTRON__RENDERER_WITH_NODE_INTEGRATION;
    }

    // Main process
    if (_IS_PROCESS && typeof process.versions === 'object' && !!process.versions.electron) {
        // For
        // ```
        // const win = new BrowserWindow({ webPreferences: { nodeIntegrationInWorker: true, contextIsolation: false } });
        // ```
        // process.type should be 'worker'
        return process["type"] === 'worker' ? ELECTRON__WEB_WORKER_NODE_INTEGRATION : ELECTRON__MAIN;
    }

    // Detect the user agent when the `nodeIntegration` option is set to false
    // eslint-disable-next-line unicorn/prefer-includes
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
    ENVIRONMENT_IS_NODE = _toString.call(process) === "[object process]"
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

const ENVIRONMENT_IS_WEB_WORKER = !ENVIRONMENT_IS_NODE
    // && typeof globalThis.onmessage !== 'undefined'
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof WorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").WorkerGlobalScope} */globalThis)["importScripts"] === 'function'
    && !_IS_DOCUMENT
    && !_IS_WINDOW
    && _IS_NAVIGATOR
    // Can't <reference lib="webworker" /> due error like:
    // `TS2403: Subsequent variable declarations must have the same type. Variable 'location' must be of type 'Location', but here has type 'WorkerLocation'.  lib.dom.d.ts(19615, 13): 'location' was also declared here.`
    // see node_modules/typescript/lib/lib.webworker.d.ts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof WorkerNavigator !== 'undefined' && (/** @type {import("typescript/lib/lib.webworker").WorkerNavigator} */navigator) instanceof WorkerNavigator
;
const ENVIRONMENT_IS_WEB_WORKLED = !ENVIRONMENT_IS_NODE
    && typeof (globalThis["WorkletGlobalScope"]) !== 'undefined'
;
const ENVIRONMENT_IS_WEB_MAIN_PROCESS = !ENVIRONMENT_IS_NODE
    && typeof window !== 'undefined'
    && globalThis === window
    && !ENVIRONMENT_IS_WEB_WORKLED
    && !ENVIRONMENT_IS_WEB_WORKER
    /*
    In Electon Renderer process (Web Window) with { nodeIntegration: true, contextIsolation: false }: `Object.prototype.toString.call(window) === '[object global]'`.
    Also see: https://www.electronjs.org/docs/latest/api/process#processcontextisolated-readonly
    */
    && ((ELECTRON_ENV === ELECTRON__RENDERER_WITH_NODE_INTEGRATION && _IS_PROCESS && process["contextIsolated"] === false)
        ? _toString.call(window) === '[object global]'
        : _toString.call(window) === '[object Window]'
    )
;
// Based on https://stackoverflow.com/a/39473604
// todo: Как выставлять isWeb для ReactNative: в true или в false? Нужно понять, как для ReactNative пишется код и
//   совместим ли он с кодом для "обычного" Web'а.
// noinspection JSDeprecatedSymbols
const ENVIRONMENT_IS_REACT_NATIVE = !_IS_DOCUMENT && _IS_NAVIGATOR && navigator.product == 'ReactNative';

const ENVIRONMENT_IS_MAIN_THREAD = ENVIRONMENT_IS_NODE
    ? ENVIRONMENT_IS_NODE_MAIN_THREAD
    : ((!ENVIRONMENT_IS_WEB_WORKER && !ENVIRONMENT_IS_WEB_WORKLED) && ENVIRONMENT_IS_WEB_MAIN_PROCESS)
;
const ENVIRONMENT_IS_WORKER_OR_WORKLED_THREAD = ENVIRONMENT_IS_NODE
    ? !ENVIRONMENT_IS_NODE_MAIN_THREAD
    : (ENVIRONMENT_IS_WEB_WORKER || ENVIRONMENT_IS_WEB_WORKLED)
;
const ENVIRONMENT_IS_WEB = ENVIRONMENT_IS_WEB_MAIN_PROCESS || ENVIRONMENT_IS_WEB_WORKER || ENVIRONMENT_IS_WEB_WORKLED;

// ===========================================================================================
// -----------============================== exports ==============================-----------
// ===========================================================================================

/**
 * Is this code running in **non-Worker** environment? For browser and nodejs.
 *
 * `true` if negative {@link isNodeJSWorker} and {@link isWebWorker}, and {@link isWebWorklet}.
 *
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 * @see [isWebMainThread]{@link isWebMainThread}
 */
export const isMainThread: boolean = ENVIRONMENT_IS_MAIN_THREAD;

/**
 * Is this code running in **Worker** environment? For browser (worker and worklet) and nodejs (worker).
 *
 * `true` if positive {@link isNodeJSWorker} or {@link isWebWorker}, or {@link isWebWorklet}.
 *
 * {@link isNodeJSMainThread} and {@link isWebMainThread} will be `false`.
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
 * @see [isNodeJS]{@link isNodeJS}
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 */
export const isNodeJSDependentProcess: boolean = ENVIRONMENT_IS_NODE
    && !!process.send
    && !!process.disconnect
;

/**
 * Is this code running in nodejs **Worker** environment?
 *
 * If `true`, {@link isNodeJS} will be `true`, {@link isNodeJSMainThread} will be `false`.
 *
 * @see {@link https://nodejs.org/api/worker_threads.html#worker_threads_class_worker}
 */
export const isNodeJSWorker: boolean = ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_NODE_MAIN_THREAD;

// -----------============================== Web details ==============================-----------

/**
 * Is this code running in **WEB** environment?
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
 * @see [window.open]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/open}
 * @see [window.opener]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/opener}
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
    // @ts-ignore
    && typeof DedicatedWorkerGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && (/** @type {import("typescript/lib/lib.webworker").DedicatedWorkerGlobalScope} */globalThis) instanceof DedicatedWorkerGlobalScope
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
    // @ts-ignore
    && typeof SharedWorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").SharedWorkerGlobalScope} */globalThis)["onconnect"] !== 'undefined'
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
    // @ts-ignore
    && typeof ServiceWorkerGlobalScope !== 'undefined'
    && typeof (/** @type {import("typescript/lib/lib.webworker").ServiceWorkerGlobalScope} */globalThis)["skipWaiting"] === 'function'
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
    // @ts-ignore
    && typeof PaintWorkletGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof (globalThis as PaintWorkletGlobalScope).registerPaint === 'function'
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
    // @ts-ignore
    && typeof AudioWorkletGlobalScope !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    && typeof (globalThis as AudioWorkletGlobalScope).registerProcessor === 'function'
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

// -----------============================== Some detailed info (can be used for debug) ==============================-----------

const _envDetails = {
    isMainThread,
    isWorkerThread,

    isNodeJS,
    isNodeJSMainThread,
    isNodeJSDependentProcess,
    isNodeJSWorker,

    isWeb,
    isWebMainThread,
    isWebDependentWindow,
    isWebWorker,
    isWebDedicatedWorker,
    isWebSharedWorker,
    isWebServiceWorker,
    isWebWorklet,
    isWebPaintWorklet,
    isWebAudioWorklet,

    isCordova,

    isElectron,
    isElectronMain,
    isElectronRenderer,
    isElectronRendererPreload,
    isElectronNodeIntegration,

    isReactNative,
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
