'use strict';

import {
    envDetails,
    isMainThread,
    isBun,
    isDeno,
    isNodeJS,
} from '../build/dist/mjs/runEnv.mjs';

const runtimeName = isBun ? 'Bun'
    : isDeno ? 'Deno'
    : isNodeJS ? 'NodeJS'
    : 'Unknown'
;
const label = isMainThread
    ? `${runtimeName} Main Thead`
    : `${runtimeName} Worker Thead`
;

console.log(label, envDetails);

if (isMainThread) {
    if (isBun) {
        const workerURL = new URL(__filename, import.meta.url).href;

        new Worker(workerURL);
    }
    else if (isDeno) {
        const workerURL = new URL('./showDetails_mjs.mjs', import.meta.url).href;

        new Worker(workerURL, { type: 'module' });
    }
}
