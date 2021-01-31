'use strict';

// https://stackoverflow.com/a/23619712
// https://github.com/emscripten-core/emscripten/blob/54b0f19d9e8130de16053b0915d114c346c99f17/src/shell.js
// var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
// var ENVIRONMENT_IS_WEB = typeof window === 'object';
// var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

let ENVIRONMENT_IS_NODE = false;

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
        //     isNodeJS === true
        // }
    }
}

const ENVIRONMENT_IS_WEB_WORKER = !ENVIRONMENT_IS_NODE && typeof importScripts === 'function' && typeof document === 'undefined';

export const isNodeJS = ENVIRONMENT_IS_NODE;
export const isWeb = !ENVIRONMENT_IS_NODE;
export const isWebWorker = ENVIRONMENT_IS_WEB_WORKER;
