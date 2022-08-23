// noinspection JSUnusedLocalSymbols

'use strict';

import { envDetails, envDetailsFull, IEnvDetailsFull, IEnvDetailsKeys } from '../runEnv';
import FakeDocument from "../spec_utils/FakeDocument";
import { FakeProcess } from "../spec_utils/FakeProcess";

function _runEnv_inContext(context: Object): IEnvDetailsFull {
    const replacedContextProps: Record<string, ReturnType<typeof Object.getOwnPropertyDescriptor>> = {};

    for (const key of Object.keys(context)) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        const newDescriptor = Object.getOwnPropertyDescriptor(context, key);

        if (currentDescriptor) {
            replacedContextProps[key] = currentDescriptor;
        }

        if (newDescriptor) {
            Object.defineProperty(globalThis, key, newDescriptor);
        }
    }

    jest.resetModules();

    const runEnv_Module = require('../runEnv');

    for (const key of Object.keys(replacedContextProps)) {
        const descriptor = replacedContextProps[key];

        if (descriptor) {
            Object.defineProperty(globalThis, key, descriptor);
        }
    }

    return runEnv_Module.envDetailsFull;
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

            expect(runEnv_NodeJSMainThead.isMainThread).toBe(true);
            expect(runEnv_NodeJSMainThead.isNodeJS).toBe(true);
            expect(runEnv_NodeJSMainThead.isNodeJSMainThread).toBe(true);
            expect(runEnv_NodeJSMainThead.isWorkerThread).toBe(false);
            expect(runEnv_NodeJSMainThead.isNodeJSWorker).toBe(false);

            // all other props should be false
            _check_runEnv_props(runEnv_NodeJSMainThead, [
                'isMainThread',
                'isNodeJS',
                'isNodeJSMainThread',
            ]);
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

            process.send = prev_value_send;
            process.disconnect = prev_value_disconnect;

            expect(runEnv_NodeJSDependentProcess.isMainThread).toBe(true);
            expect(runEnv_NodeJSDependentProcess.isNodeJS).toBe(true);
            expect(runEnv_NodeJSDependentProcess.isNodeJSMainThread).toBe(true);
            expect(runEnv_NodeJSDependentProcess.isNodeJSDependentProcess).toBe(true);
            expect(runEnv_NodeJSDependentProcess.isWorkerThread).toBe(false);
            expect(runEnv_NodeJSDependentProcess.isNodeJSWorker).toBe(false);

            // all other props should be false
            _check_runEnv_props(runEnv_NodeJSDependentProcess, [
                'isMainThread',
                'isNodeJS',
                'isNodeJSMainThread',
                'isNodeJSDependentProcess',
            ]);
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
    const like_WebWorkerContext = Object.defineProperties(Object.defineProperties({
        importScripts() {},
        WorkerGlobalScope: {
            importScripts() {},
        },
        WorkerNavigator: class WorkerNavigator {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
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

            expect(runEnv_WebMainThread.isMainThread).toBe(true);
            expect(runEnv_WebMainThread.isWeb).toBe(true);
            expect(runEnv_WebMainThread.isWebMainThread).toBe(true);
            expect(runEnv_WebMainThread.isWebDependentWindow).toBe(false);
            expect(runEnv_WebMainThread.isWebWorker).toBe(false);

            // all other props should be false
            _check_runEnv_props(runEnv_WebMainThread, [
                'isMainThread',
                'isWeb',
                'isWebMainThread',
            ]);
        });

        it('WebDependentWindow', function() {
            like_WebMainThreadContext["opener"] = {};

            const runEnv_WebMainThread = _runEnv_inContext(like_WebMainThreadContext);

            delete like_WebMainThreadContext["opener"];

            expect(runEnv_WebMainThread.isMainThread).toBe(true);
            expect(runEnv_WebMainThread.isWeb).toBe(true);
            expect(runEnv_WebMainThread.isWebMainThread).toBe(true);
            expect(runEnv_WebMainThread.isWebDependentWindow).toBe(true);
            expect(runEnv_WebMainThread.isWebWorker).toBe(false);

            // all other props should be false
            _check_runEnv_props(runEnv_WebMainThread, [
                'isMainThread',
                'isWeb',
                'isWebMainThread',
                'isWebDependentWindow',
            ]);
        });

        it('WebWorker', function() {
            const runEnv_WebWorker = _runEnv_inContext(like_WebWorkerContext);

            expect(runEnv_WebWorker.isWeb).toBe(true);
            expect(runEnv_WebWorker.isWorkerThread).toBe(true);
            expect(runEnv_WebWorker.isWebWorker).toBe(true);
            expect(runEnv_WebWorker.isMainThread).toBe(false);
            expect(runEnv_WebWorker.isWebMainThread).toBe(false);
            expect(runEnv_WebWorker.isWebDependentWindow).toBe(false);

            // all other props should be false
            _check_runEnv_props(runEnv_WebWorker, [
                'isWeb',
                'isWorkerThread',
                'isWebWorker',
            ]);
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
            const runEnv_WebMainThread = _runEnv_inContext(like_ElectronMainContext);

            expect(runEnv_WebMainThread.isMainThread).toBe(true);
            expect(runEnv_WebMainThread.isNodeJS).toBe(true);
            expect(runEnv_WebMainThread.isNodeJSMainThread).toBe(true);
            expect(runEnv_WebMainThread.isElectron).toBe(true);
            expect(runEnv_WebMainThread.isElectronMain).toBe(true);
            expect(runEnv_WebMainThread.isElectronNodeIntegration).toBe(true);
            expect(runEnv_WebMainThread.isElectronRenderer).toBe(false);
            expect(runEnv_WebMainThread.isWeb).toBe(false);

            // all other props should be false
            _check_runEnv_props(runEnv_WebMainThread, [
                'isMainThread',
                'isNodeJS',
                'isNodeJSMainThread',
                'isElectron',
                'isElectronMain',
                'isElectronNodeIntegration',
            ]);
        });
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
