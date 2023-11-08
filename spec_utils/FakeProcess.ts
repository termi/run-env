// noinspection JSUnusedGlobalSymbols,JSAnnotator

'use strict';

const { performance } = require('node:perf_hooks');
const { EventEmitter } = require('node:events');

const real_process = typeof process !== 'undefined' ? process : void 0;

type ProcessVersions = typeof process.versions;

const _SECOND = 1000;

export class FakeProcess extends EventEmitter implements NodeJS.Process {
    public readonly isFakeProcess = true;
    public type: string | void;
    // this can
    public versions: ProcessVersions = {
        ares: 'x',
        http_parser: 'x',
        modules: 'x',
        node: 'x',
        uv: 'x',
        v8: 'x',
        openssl: 'x',
        zlib: 'x',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    public send?: typeof process.send | null;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    public disconnect?: typeof process.disconnect | null;

    constructor(options: {
        type?: string,
        versions?: Record<string, string>,
        send?: typeof process.send | null,
        disconnect?: typeof process.disconnect | null,
    } = {}) {
        super();

        if (real_process && (real_process as unknown as FakeProcess) !== this) {
            const real_process_unEnumerableProps: Record<string, ReturnType<typeof Object.getOwnPropertyDescriptor>> = {};

            for (const key of Object.keys(real_process)) {
                if (key in this) {
                    const propDescription = Object.getOwnPropertyDescriptor(real_process, key);

                    if (propDescription?.enumerable) {
                        real_process_unEnumerableProps[key] = propDescription;

                        Object.defineProperty(real_process, key, { enumerable: false, configurable: true });
                    }
                }
            }

            // noinspection TypeScriptValidateTypes
            Object.assign(this, real_process);

            // return back properties descriptions
            for (const key of Object.keys(real_process_unEnumerableProps)) {
                const propDescription = real_process_unEnumerableProps[key];

                if (propDescription) {
                    Object.defineProperty(real_process, key, propDescription);
                }
            }

            // get versions from real process
            Object.assign(this.versions, real_process.versions);
        }

        if (options.type !== void 0) {
            this.type = options.type;
        }
        if (options.versions !== void 0) {
            this.versions = Object.assign({}, this.versions, options.versions);
        }
        if (options.send !== void 0) {
            this.send = options.send;
        }
        if (options.disconnect !== void 0) {
            this.disconnect = options.disconnect;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    nextTick(callback: Function, ...args: any[]): void {
        if (real_process) {
            real_process.nextTick(callback, ...args);
        }
        else if (typeof setImmediate === 'function') {
            setImmediate(callback as (...args: any[]) => void, ...args);
        }
        else {
            setTimeout(callback, 0, ...args);
        }
    }

    public hrtime = hrtime as NodeJS.HRTime;

    // eslint-disable-next-line class-methods-use-this
    uptime() {
        if (real_process) {
            return real_process.uptime();
        }

        return performance.now() / _SECOND;
    }

    [Symbol.toStringTag] = 'process';
}

function hrtime() {
    if (real_process) {
        return real_process.hrtime();
    }

    // todo: use cftools/common/performancePolyfill.ts to implement hrtime
    throw new Error('FakeProcess#hrtime not implemented');
}

hrtime.bigint = function() {
    if (real_process) {
        return real_process.hrtime.bigint();
    }

    // todo: use cftools/common/performancePolyfill.ts to implement hrtime
    throw new Error('FakeProcess#hrtime not implemented');
};

FakeProcess.prototype.hrtime = hrtime as NodeJS.HRTime;
