'use strict';

import {envDetails, IEnvDetailsFull, IEnvDetailsKeys} from '../runEnv';

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
    describe('NodeJS process', function() {
        const like_NodeJSMainTheadContext = {
            process,
            window: void 0,
        };

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
            const prev_value_send = process.send;
            const prev_value_disconnect = process.disconnect;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            process.send = function(message:any){ return false };
            process.disconnect = function(){};

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

    describe('Web process', function() {
        const like_mainWebContext = {
            process: void 0,
            get window() { return this },
            document: { [Symbol.toStringTag]: 'HTMLDocument' },
            navigator: { [Symbol.toStringTag]: 'Navigator' },
            [Symbol.toStringTag]: 'Window',
        };
        const like_WebWorkerContext = Object.defineProperties(Object.defineProperties({
            importScripts() {},
            WorkerGlobalScope: { importScripts() {} },
            WorkerNavigator: class WorkerNavigator { [Symbol.toStringTag]: 'WorkerNavigator' },
        }, Object.getOwnPropertyDescriptors(like_mainWebContext)), {
            document: { value: void 0 },
            window: { value: void 0 },
            navigator: { get() { return new this.WorkerNavigator(); } },
        });

        it('WebMainThread', function() {
            const runEnv_WebMainThread = _runEnv_inContext(like_mainWebContext);

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
            like_mainWebContext["opener"] = {};

            const runEnv_WebMainThread = _runEnv_inContext(like_mainWebContext);

            delete like_mainWebContext["opener"];

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

    describe('envDetails', function() {
        it('should be only `true` values', function() {
            expect(Object.values(envDetails).reduce((obj, value) => {
                obj[value + ''] = 1;

                return obj;
            }, {})).toEqual({ true: 1 });
        });
    });
});
