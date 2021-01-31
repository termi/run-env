'use strict';

let isNodeJS = false;

if (typeof process !== 'undefined') {
    isNodeJS = process && typeof process === 'object';// Maybe this is Node.js

    if (isNodeJS) {
        if (typeof window !== 'undefined') {
            if (window["__fake__"]) {
                // (jsdom is used automatically)[https://github.com/facebook/jest/issues/3692#issuecomment-304945928]
                // workaround for jest+JSDOM
                isNodeJS = true;
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
                    isNodeJS = true;
                }
            }
            else {
                isNodeJS = false;
            }
        }
        else if (process["browser"]) {
            // babel process shim
            isNodeJS = false;
        }
        // else {
        //     isNodeJS === true
        // }
    }
}

/** @type {boolean} */
module.exports = /** @type {boolean} */isNodeJS;
