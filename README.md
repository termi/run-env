# [run-env](http://github.com/termi/run-env)

[![npm version](https://badge.fury.io/js/run-env.svg)](https://www.npmjs.com/package/run-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Detect current JavaScript environment.

## Install

```shell
npm install --save run-env
```

## Usage

### TypeScript

```typescript
import {
    isNodeJS,
    isDeno,
    isWeb,
    isWorkerThread,
} from 'run-env';
import * as process from "process";

if (isNodeJS) {
    console.info('This is nodejs', typeof process);
}

if (isDeno) {
    console.info('This is Deno', typeof Deno);
}

if (isWeb) {
    console.info('This is Web', typeof document);
}

if (isWorkerThread) {
    console.info('This is Worker (nodejs or Web, or Deno)',
        typeof process !== 'undefined' ? typeof process.disconnect : void 0,
        typeof WorkerNavigator
    );
}
```

## List of variables

### Common

#### `isMainThread`

Is this code running in **non-Worker** environment? For browser and nodejs.

`true` if negative `isNodeJSWorker` and `isWebWorker`, and `isWebWorklet`, and `isDenoWorker`.

#### `isWorkerThread`

Is this code running in **Worker** environment? For browser (worker and worklet) and nodejs (worker).

`true` if positive `isNodeJSWorker` or `isWebWorker`, or `isWebWorklet`, or `isDenoWorker`.

### [Node.js](https://nodejs.org/)

#### `isNodeJS`

Is this code running in nodejs environment?

#### `isNodeJSMainThread`

Is this code running in nodejs **non-Worker** environment?

If `true`, `isNodeJS` will be `true` and `isNodeJSWorker` will be `false`.

#### `isNodeJSDependentProcess`

Is Node.js process is spawned with an IPC channel (see the [Child Process](https://nodejs.org/api/child_process.html)
and [Cluster](https://nodejs.org/api/cluster.html) documentation).

[`process.send`](https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback)
and
[`process.disconnect`](https://nodejs.org/api/process.html#processdisconnect)
functions is defined.

Node.js docs about IPC channel and subprocess:

> When an IPC channel has been established between the parent and child ( i.e. when using [child_process.fork()](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options)),
> the `subprocess.send()` method can be used to send messages to the child process. When the child process is a
> Node.js instance, these messages can be received via the ['message'](https://nodejs.org/api/process.html#process_event_message)
> event.
>
> Child Node.js processes will have a process.send() method of their own that allows the child to send messages back to the parent.
>
> Accessing the IPC channel fd in any way other than [process.send()](https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback)
> or using the IPC channel with a child process that is not a Node.js instance is not supported.
>
> See example here: [nodejs/docs/child_process/subprocess.send](https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback)

Node.js docs about Cluster worker processes:

> A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load.
>
> The cluster module allows easy creation of child processes that all share server ports.
>
> See example here: [nodejs/docs/cluster/Event:'message'](https://nodejs.org/api/cluster.html#event-message)
 
#### `isNodeJSWorker`

Is this code running in nodejs **Worker** environment?

If `true`, `isNodeJS` will be `true`, `isNodeJSMainThread` will be `false`.

### [Deno](https://deno.land/)

#### `isDeno`

Is this code running in [Deno](https://deno.land/) environment?

Deno: Next-generation JavaScript Runtime.

#### `isDenoMainThread`

Is Deno main thread.

#### `isDenoWorker`

Is [Deno Worker](https://docs.deno.com/runtime/manual/runtime/workers).

Deno supports [`Web Worker API`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker).

#### `isDenoWorkerWithImportScripts`

Is [Deno Worker](https://docs.deno.com/runtime/manual/runtime/workers) with
[`importScripts`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)
function supports.

In Deno, `importScripts` is optional for Worker's.

### Web

#### `isWebMainThreadCompatible`

Is this code running in **WEB** environment with such global objects available:
* [`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window)
* [`document`](https://developer.mozilla.org/en-US/docs/Web/API/Window/document)
* [`navigator`](https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator)

In *common cases* this mean this is fully compatible **WEB** environment.

If `true`, one of (`isNodeJS`, `isDeno`, `isNWJSMixedContextWindow`, `isElectron` etc) may be `true`.

#### `isWeb`

Is this code running in **WEB** environment?

If `true`, `isNodeJS` will be `false`.

#### `isWebMainThread`

Is this code running in **WEB** environment and it is a **common web Window** process (**non-Worker** environment)?

`true` if positive `isWeb`, and negative `isWebWorker` and `isWebWorklet`.

#### `isWebDependentWindow`

Is this code running in main **WEB** environment in window opened by `window.open` (**dependent window** environment)?

#### `isWebWorker`

Is this code running in **Web Worker** environment?

If `true`, `isWeb` will be `true`.

#### `isWebDedicatedWorker`

Is this code running in **DedicatedWorker** environment?

If `true`, `isWebWorker` will be `true` and `isWeb` will be `true`.

#### `isWebSharedWorker`

Is this code running in **SharedWorker** environment?

If `true`, `isWebWorker` will be `true` and `isWeb` will be `true`.

#### `isWebServiceWorker`

Is this code running in **ServiceWorker** environment?

If `true`, `isWebWorker` will be `true` and `isWeb` will be `true`.

#### `isWebWorklet`

Is this code running in **Web Worklet** environment?

If `isWebWorklet` = `true`, `isWeb` always will be `true`.

#### `isWebPaintWorklet`

Is this code running in **PaintWorklet** environment?

If `isWebPaintWorklet` = `true`,  `isWebWorklet` always will be `true` and `isWeb` always will be `true`.

#### `isWebAudioWorklet`

Is this code running in **AudioWorklet** environment?

If `isWebAudioWorklet` = `true`, `isWebWorklet` always will be `true` and `isWeb` always will be `true`.

### [Cordova](https://cordova.apache.org/docs/en/latest/)

#### `isCordova`

Is this code running in any Cordova environment?

### [NW.js](https://nwjs.io/)

#### `isNWJSMixedContextWindow`

NW.js lets you call all Node.js modules directly from DOM and enables a new way of writing applications
with all Web technologies. It was previously known as “node-webkit” project.

Note that `isWebMainThreadCompatible` will be also `true` if this NWJS window is include Web context.

### [Electron](https://www.electronjs.org/docs/)

#### `isElectron`

Is this code running in any Electron environment?

#### `isElectronMain`

Is this is [main Electron process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process)?

Electron Glossary: [main process](https://www.electronjs.org/docs/latest/glossary#main-process)

The main process, commonly a file named `main.js`, is the entry point to every Electron app. It controls the life of
the app, from open to close. It also manages native elements such as the Menu, Menu Bar, Dock, Tray, etc. The main
process is responsible for creating each new renderer process in the app. The full Node API is built in.

Every app's main process file is specified in the `main` property in `package.json`. This is how `electron .` knows
what file to execute at startup.

In Chromium, this process is referred to as the "browser process". It is renamed in Electron to avoid confusion with renderer processes.

#### `isElectronRenderer`

Is this is [Renderer process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process)
of [browser Window](https://www.electronjs.org/docs/latest/api/browser-window)
in Electron app?

Electron Glossary: [renderer process](https://www.electronjs.org/docs/latest/glossary#renderer-process)

Note that it can be Renderer process without node integration: {@link isElectronRenderer} = `true` and {@link isElectronNodeIntegration} = `false`.

The renderer process is a browser window in your app. Unlike the main process, there can be multiple of these and
each is run in a separate process. They can also be hidden.

In normal browsers, web pages usually run in a sandboxed environment and are not allowed access to native resources.
Electron users, however, have the power to use Node.js APIs in web pages allowing lower level operating system
interactions.

#### `isElectronRendererPreload`

Is this is [Preload scripts](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)
of [Renderer process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process)
of [browser Window](https://www.electronjs.org/docs/latest/api/browser-window)
in Electron app?

You can use this value to check if `contextBridge` API is enable (or you can use `process.contextIsolated`).

Error example: `contextBridge API can only be used when contextIsolation is enabled`.

Note: With `{ webPreferences: { nodeIntegrationInWorker: true, contextIsolation: false } }` we can't detect preload
process, so this value always be `false` even executing in `preload.js` file.

#### `isElectronNodeIntegration`

Is it Electron process with node integration? One of case should be `true`:
- It's [Electron Main process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process).
  In this case: `isElectronMain` = `true`.
- It's [Electron Renderer process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process)
  with `nodeIntegration==true` and `contextIsolation==false`. In this case: `isElectronMain` = `false`, `isElectronRenderer` = `true`.
- It's [WebWorker](https://www.electronjs.org/docs/latest/tutorial/multithreading)
  running in Electron app with `nodeIntegrationInWorker==true` and `contextIsolation==false`.
  In this case: `isElectronMain` = `false` and `isElectronRenderer` = `false`, and  {@link isElectron} = `true`, and `isWebWorker` = `true`.

example: opening a new window with node integration:
```javascript
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
example: opening a new window and running WebWorker on it (without code for Worker running):
```javascript
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

### [ReactNative](https://reactnative.dev/)

#### `isReactNative`

Is running in `ReactNative` environment?

### [JSDOM](https://github.com/jsdom/jsdom#readme)

#### `isJSDOM`

jsdom is a pure-JavaScript implementation of many web standards, notably the WHATWG DOM and HTML Standards, for use
with Node.js. In general, the goal of the project is to emulate enough of a subset of a web browser to be useful
for testing and scraping real-world web applications.
