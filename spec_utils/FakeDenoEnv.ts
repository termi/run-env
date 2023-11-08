'use strict';

export class FakeDeno {
    version = {
        fakeDeno: true,
        deno: "1.38.0",
        v8: "12.0.267.1",
        typescript: "5.2.2",
    } as {
        deno: string,
        v8: string,
        typescript: string,
    };

    build = {
        target: "x86_64-pc-windows-msvc",
        arch: "x86_64",
        os: "windows",
        vendor: "pc",
        env: "msvc",
    } as {
        target: string | "x86_64-pc-windows-msvc",
        arch: string | "x86_64",
        os: string | "windows",
        vendor: string | "pc",
        env: string | "msvc",
    };

    errors = [
        "NotFound",           "PermissionDenied",
        "ConnectionRefused",  "ConnectionReset",
        "ConnectionAborted",  "NotConnected",
        "AddrInUse",          "AddrNotAvailable",
        "BrokenPipe",         "AlreadyExists",
        "InvalidData",        "TimedOut",
        "Interrupted",        "WriteZero",
        "WouldBlock",         "UnexpectedEof",
        "BadResource",        "Http",
        "Busy",               "NotSupported",
        "FilesystemLoop",     "IsADirectory",
        "NetworkUnreachable", "NotADirectory",
    ].reduce((obj, key) => {
        obj[key] = new Function(`class ${key} extends Error {}`)();

        return obj;
    }, {});

    // eslint-disable-next-line class-methods-use-this
    close() {
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(0);
    }

    Buffer = Buffer;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    static #singletonInstance: FakeDeno;

    static makeSingleton() {
        if (!this.#singletonInstance) {
            this.#singletonInstance = new FakeDeno();
        }

        return this.#singletonInstance;
    }
}

export class FakeDenoNavigator {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    hardwareConcurrency = 12;
    userAgent = 'Deno/1.38.0';
    language = 'en';
    languages = [ 'en' ];
}

function _denoNotImplrementd() {
    throw new Error('not implemented');
}

export class FakeDenoWindow {
    Deno = new FakeDeno();

    queueMicrotask = queueMicrotask;
    atob = atob;
    btoa = btoa;
    caches = {};
    crypto = require('node:crypto').webcrypto;
    fetch = typeof fetch === 'function' ? fetch : _denoNotImplrementd;
    EventSource = typeof EventTarget === 'function' ? EventTarget : _denoNotImplrementd;
    reportError = _denoNotImplrementd;
    structuredClone = globalThis.structuredClone;
    self = this;
    navigator = new FakeDenoNavigator();
    alert = _denoNotImplrementd;
    confirm = _denoNotImplrementd;
    prompt = _denoNotImplrementd;
    localStorage = {
        getItem: _denoNotImplrementd,
        setItem: _denoNotImplrementd,
    };
    sessionStorage = {
        getItem: _denoNotImplrementd,
        setItem: _denoNotImplrementd,
    };
    name = '';
    close = _denoNotImplrementd;
    closed = false;
    onerror = null;
    onload = null;
    onbeforeunload = null;
    onunload = null;
    onunhandledrejection = null;
    clear = _denoNotImplrementd;
    clearInterval = clearInterval;
    clearTimeout = clearTimeout;
    performance = typeof performance === 'object' ? performance : null;
    setInterval = setInterval;
    setTimeout = setTimeout;
    window = this;
}
