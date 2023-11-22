'use strict';

import {
    envDetails,
    isMainThread,
    isBun,
    isDeno,
    isNodeJS,
} from '../runEnv.ts';

declare var __filename: string;

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
        const workerURL = new URL('./showDetails_ts.ts', import.meta.url).href;

        new Worker(workerURL, { type: 'module' });
    }
}
