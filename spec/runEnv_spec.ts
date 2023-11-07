// noinspection JSUnusedLocalSymbols

'use strict';

import {
    envDetails,
    envDetailsFull,
    IEnvDetails,
    IEnvDetailsFull,
    IEnvDetailsKeys,
} from '../runEnv';
import FakeDocument from "../spec_utils/FakeDocument";
import { FakeProcess } from "../spec_utils/FakeProcess";
import { FakeDenoWindow, FakeDenoNavigator } from "../spec_utils/FakeDenoEnv";

function _runEnv_inContext(context: Object, removeJSDOMFootprints = true) {
    const replacedContextProps: Record<string, ReturnType<typeof Object.getOwnPropertyDescriptor>> = {};

    for (const key of Object.keys(context)) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        const newDescriptor = Object.getOwnPropertyDescriptor(context, key);

        if (currentDescriptor) {
            replacedContextProps[key] = currentDescriptor;
        }
        else {
            replacedContextProps[key] = {
                value: void 0,
                enumerable: false,
                writable: true,
                configurable: true,
            };
        }

        if (newDescriptor) {
            Object.defineProperty(globalThis, key, newDescriptor);
        }
    }

    if (removeJSDOMFootprints) {
        if (!!window && window.name === 'nodejs') {
            window.name = '';
        }

        if (!!globalThis["navigator"] && /(Node\.js|jsdom)/.test(navigator.userAgent)) {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'NOT A JSDOM',
                enumerable: false,
                writable: false,
                configurable: true,
            });
        }
    }

    jest.resetModules();

    const runEnv_Module = require('../runEnv') as typeof import('../runEnv');

    for (const key of Object.keys(replacedContextProps)) {
        const descriptor = replacedContextProps[key];

        if (descriptor) {
            Object.defineProperty(globalThis, key, descriptor);
        }
    }

    return runEnv_Module;
}

const specialPropsMap = {
    envDetails: true,
    envDetailsFull: true,
};

function _check_runEnv_props(runEnv: IEnvDetailsFull, trueProps: IEnvDetailsKeys) {
    const truePropsMap = trueProps.reduce((obj, key) => {
        obj[key] = true;

        return obj;
    }, {});

    for (const key of trueProps) {
        expect({ key, value: runEnv[key] }).toEqual({ key, value: true });
    }

    // All other props SHOULD be `false`
    for (const key of Object.keys(runEnv)) {
        if (!truePropsMap[key] && !specialPropsMap[key]) {
            expect({ key, value: runEnv[key] }).toEqual({ key, value: false });
        }
    }
}

describe('runEnv', function() {
    const like_NodeJSMainTheadContext = {
        process,
        window: void 0,
    };
    let prev_value_send: typeof process.send | null | undefined;
    let prev_value_disconnect: typeof process.disconnect | null | undefined;

    beforeEach(() => {
        {// jest runs tests in dependent nodejs process, so it would be process.send and process.disconnect
            // eslint-disable-next-line jest/unbound-method
            prev_value_send = process.send;
            // eslint-disable-next-line jest/unbound-method
            prev_value_disconnect = process.disconnect;

            process.send = void 0;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            process.disconnect = void 0;
        }
    });
    afterEach(() => {
        if (prev_value_send || prev_value_disconnect) {// jest runs tests in dependent nodejs process, so it would be process.send and process.disconnect
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            process.send = prev_value_send;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            process.disconnect = prev_value_disconnect;

            prev_value_send = void 0;
            prev_value_disconnect = void 0;
        }
    });

    describe('NodeJS process', function() {
        it('NodeJSMainThead', function() {
            const runEnv_NodeJSMainThead = _runEnv_inContext(like_NodeJSMainTheadContext);
            const { envDetails, envDetailsFull } = runEnv_NodeJSMainThead;

            expect(runEnv_NodeJSMainThead.isNodeJS).toBe(true);
            expect(runEnv_NodeJSMainThead.isNodeJSMainThread).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isNodeJS: true,
                isNodeJSMainThread: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        it('NodeJSDependentProcess', function() {
            // eslint-disable-next-line jest/unbound-method
            const prev_value_send = process.send;
            // eslint-disable-next-line jest/unbound-method
            const prev_value_disconnect = process.disconnect;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            process.send = function(message: any) {
                return false;
            };
            process.disconnect = function() {};

            const runEnv_NodeJSDependentProcess = _runEnv_inContext(like_NodeJSMainTheadContext);
            const { envDetails, envDetailsFull } = runEnv_NodeJSDependentProcess;

            process.send = prev_value_send;
            process.disconnect = prev_value_disconnect;

            expect(runEnv_NodeJSDependentProcess.isNodeJS).toBe(true);
            expect(runEnv_NodeJSDependentProcess.isNodeJSDependentProcess).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isNodeJS: true,
                isNodeJSMainThread: true,
                isNodeJSDependentProcess: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });
    });

    const like_WebMainThreadContext = {
        process: void 0,
        get window() {
            return this;
        },
        document: new FakeDocument(),
        navigator: { [Symbol.toStringTag]: 'Navigator' },
        [Symbol.toStringTag]: 'Window',
    };
    const like_WebMainThreadCompatibleContext = {
        process,
        get window() {
            return this;
        },
        document: new FakeDocument(),
        navigator: { [Symbol.toStringTag]: 'Navigator' },
        [Symbol.toStringTag]: 'Window',
    };
    const like_WebWorkerContext = Object.defineProperties(Object.defineProperties({
        importScripts() {},
        WorkerGlobalScope: {
            importScripts() {},
        },
        WorkerNavigator: class WorkerNavigator {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore
            [Symbol.toStringTag]: 'WorkerNavigator';
        },
    }, Object.getOwnPropertyDescriptors(like_WebMainThreadContext)), {
        // descriptor's below:
        document: { value: void 0 },
        window: { value: void 0 },
        navigator: {
            get() {
                return new this.WorkerNavigator();
            },
        },
    });

    describe('Web process', function() {
        it('WebMainThread', function() {
            const runEnv_WebMainThread = _runEnv_inContext(like_WebMainThreadContext);
            const { envDetails, envDetailsFull } = runEnv_WebMainThread;

            expect(runEnv_WebMainThread.isWeb).toBe(true);
            expect(runEnv_WebMainThread.isWebMainThread).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isWeb: true,
                isWebMainThread: true,
                isWebMainThreadCompatible: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        it('WebMainThreadCompatible', () => {
            const runEnv_WebMainThreadCompatible = _runEnv_inContext(like_WebMainThreadCompatibleContext);
            const { envDetails, envDetailsFull } = runEnv_WebMainThreadCompatible;

            expect(runEnv_WebMainThreadCompatible.isWebMainThreadCompatible).toBe(true);
            expect(runEnv_WebMainThreadCompatible.isNodeJS).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isWebMainThreadCompatible: true,
                isNodeJS: true,
                isNodeJSMainThread: true,
            });

            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        it('WebDependentWindow', function() {
            like_WebMainThreadContext["opener"] = {};

            const runEnv_WebMainThread = _runEnv_inContext(like_WebMainThreadContext);

            delete like_WebMainThreadContext["opener"];

            const { envDetails, envDetailsFull } = runEnv_WebMainThread;

            expect(runEnv_WebMainThread.isWeb).toBe(true);
            expect(runEnv_WebMainThread.isWebDependentWindow).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isWeb: true,
                isWebMainThread: true,
                isWebMainThreadCompatible: true,
                isWebDependentWindow: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        it('WebWorker', function() {
            const runEnv_WebWorker = _runEnv_inContext(like_WebWorkerContext);
            const { envDetails, envDetailsFull } = runEnv_WebWorker;

            expect(runEnv_WebWorker.isWebWorker).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isWorkerThread: true,
                isWeb: true,
                isWebWorker: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });
    });

    const like_ElectronMainContext = Object.defineProperties(Object.defineProperties({}, Object.getOwnPropertyDescriptors(like_NodeJSMainTheadContext)), {
        // descriptor's below:
        document: { value: void 0 },
        window: { value: void 0 },
        process: {
            value: new FakeProcess({
                versions: {
                    electron: 'x',
                },
                // jest runs tests in dependent nodejs process, so it would be process.send and process.disconnect
                // So we need to redefined it.
                send: null,
                disconnect: null,
            }),
        },
        navigator: {
            value: {
                userAgent: 'FakeElectron Electron/xx.x',
                [Symbol.toStringTag]: 'Navigator',
            },
        },
    });

    describe('Electron process', function() {
        it('ElectronMain', function() {
            const runEnv_ElectronMain = _runEnv_inContext(like_ElectronMainContext);
            const { envDetails, envDetailsFull } = runEnv_ElectronMain;

            expect(runEnv_ElectronMain.isNodeJS).toBe(true);
            expect(runEnv_ElectronMain.isElectron).toBe(true);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isNodeJS: true,
                isNodeJSMainThread: true,
                isElectron: true,
                isElectronMain: true,
                isElectronNodeIntegration: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });
    });

    const fakeDenoWindow = new FakeDenoWindow();
    const like_DenoContext = {
        process: void 0,
        document: void 0,
        window: fakeDenoWindow,
        navigator: fakeDenoWindow.navigator,
        Deno: fakeDenoWindow.Deno,
    };
    const like_DenoWorkerContext = {
        ...like_WebWorkerContext,
        process: void 0,
        document: void 0,
        navigator: fakeDenoWindow.navigator,
        Deno: fakeDenoWindow.Deno,
        WorkerNavigator: FakeDenoNavigator,
        DedicatedWorkerGlobalScope: Object.getPrototypeOf(globalThis).constructor,
    };

    describe('Deno context', function() {
        it('DenoMain', function() {
            const runEnv_DenoMain = _runEnv_inContext(like_DenoContext);
            const {
                envDetails,
                envDetailsFull,
            } = runEnv_DenoMain;

            expect(runEnv_DenoMain.isDeno).toBe(true);
            expect(runEnv_DenoMain.isNodeJS).toBe(false);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isMainThread: true,
                isDeno: true,
                isDenoMainThread: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        it('DenoWorker - with "importScripts" function', function() {
            const runEnv_DenoMain = _runEnv_inContext(like_DenoWorkerContext);
            const {
                envDetails,
                envDetailsFull,
            } = runEnv_DenoMain;

            expect(runEnv_DenoMain.isDeno).toBe(true);
            expect(runEnv_DenoMain.isDenoWorker).toBe(true);
            expect(runEnv_DenoMain.isNodeJS).toBe(false);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isWorkerThread: true,
                isDeno: true,
                isDenoWorker: true,
                isDenoWorkerWithImportScripts: true,
                isWebWorker: true,
                isWebDedicatedWorker: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        it('DenoWorker - without "importScripts" function', function() {
            const like_DenoWorkerContext_without_importScripts = { ...like_DenoWorkerContext };

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore
            delete like_DenoWorkerContext_without_importScripts["importScripts"];

            const runEnv_DenoMain = _runEnv_inContext(like_DenoWorkerContext_without_importScripts);
            const {
                envDetails,
                envDetailsFull,
            } = runEnv_DenoMain;

            expect(runEnv_DenoMain.isDeno).toBe(true);
            expect(runEnv_DenoMain.isDenoWorker).toBe(true);
            expect(runEnv_DenoMain.isNodeJS).toBe(false);

            let envDetailsWithTrueProps: IEnvDetails;

            expect(envDetails).toEqual(envDetailsWithTrueProps = {
                isWorkerThread: true,
                isDeno: true,
                isDenoWorker: true,
                isWebWorker: true,
                isWebDedicatedWorker: true,
            });

            // all other props should be false
            _check_runEnv_props(envDetailsFull, Object.keys(envDetailsWithTrueProps) as IEnvDetailsKeys);
        });

        // todo: add JSDOM tests
        // todo: add NWJS tests
    });

    describe('envDetails', function() {
        it('should be only `true` values', function() {
            expect(Object.values(envDetails).reduce((obj, value) => {
                obj[`${value}`] = 1;

                return obj;
            }, {})).toEqual({ true: 1 });
        });
    });

    describe('envDetailsFull', function() {
        it('should be `true` or `false` values', function() {
            expect(Object.values(envDetailsFull).reduce((obj, value) => {
                obj[`${value}`] = 1;

                return obj;
            }, {})).toEqual({ true: 1, false: 1 });
        });
    });
});
