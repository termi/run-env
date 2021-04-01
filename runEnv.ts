'use strict';

// https://stackoverflow.com/a/23619712
// https://github.com/emscripten-core/emscripten/blob/54b0f19d9e8130de16053b0915d114c346c99f17/src/shell.js
// var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
// var ENVIRONMENT_IS_WEB = typeof window === 'object';
// var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

const ENVIRONMENT_IS_WEB = typeof window === 'object';
let ENVIRONMENT_IS_NODE = false;
let ENVIRONMENT_IS_NODE_MAIN_THREAD = false;

if (typeof process !== 'undefined' && typeof require === 'function') {
    ENVIRONMENT_IS_NODE = process && typeof process === 'object';// Maybe this is Node.js

    if (ENVIRONMENT_IS_NODE) {
        if (typeof window !== 'undefined') {
            if (window["__fake__"]) {
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
            const conditionalNodeRequire = (moduleName: string) => {
                return require(moduleName);
            };
            const {isMainThread} = conditionalNodeRequire('worker_threads');

            ENVIRONMENT_IS_NODE_MAIN_THREAD = isMainThread;
        }
        catch(e) {
            // old nodejs without Worker's support
            ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
        }
    }
}

const ENVIRONMENT_IS_WEB_WORKER = ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE
    && typeof globalThis["importScripts"] === 'function'
    && typeof document === 'undefined'
;

export const isNodeJS = ENVIRONMENT_IS_NODE;
export const isNodeJSWorker = !ENVIRONMENT_IS_NODE_MAIN_THREAD;
export const isWeb = ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE;
export const isWebWorker = ENVIRONMENT_IS_WEB_WORKER;
/** isMainThread for browser and nodejs */
export const isMainThread = ENVIRONMENT_IS_NODE ? ENVIRONMENT_IS_NODE_MAIN_THREAD : !ENVIRONMENT_IS_WEB_WORKER;
/** isWorkerThread for browser and nodejs */
export const isWorkerThread = ENVIRONMENT_IS_NODE ? !ENVIRONMENT_IS_NODE_MAIN_THREAD : ENVIRONMENT_IS_WEB_WORKER;
