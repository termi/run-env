#!/usr/bin/env node
'use strict';

// see also https://github.com/yext/chat-ui-react/commit/ae1c8560200b67da66e70f0c0437fca3fcb4aec8#diff-47407fecafdf5f5cd55403c3de457833ddf9b6fab45253c04e1dc4c7cb4495b1

const {
    readdir,
    stat,
    rename,
    rm,
    copyFile,
} = require('node:fs/promises');
const {
    existsSync,
} = require('node:fs')
const {
    join,
    extname,
    dirname,
    basename,
} = require('node:path');

// process.argv[0] is 'node.exe'
// process.argv[1] is __filename
const dirnameForScan = process.argv[2];
let newExt = process.argv[3];

if (!dirnameForScan) {
    throw new Error('required one cli parameter');
}

if (newExt !== 'mjs' && newExt !== 'cjs'
    && newExt !== '.mjs' && newExt !== '.cjs'
) {
    throw new Error(`second cli parameter should be one of: .mjs, .cjs. But it is: ${newExt}`);
}

if (process.argv.length > 4) {
    throw new Error('required only two cli parameters');
}

if (!newExt.startsWith('.')) {
    newExt = '.' + newExt;
}

function _changeFileExt(filename, oldExt, newExt) {
    const dirName = dirname(filename);
    const baseName = basename(filename, oldExt);

    return join(dirName, `${baseName}${newExt}`);
}

async function scanDirAndRenameJSFiles(dirName, newExt) {
    console.log('reading directory:', dirName);

    await readdir(dirName, { recursive: true }).then(async (files) => {
        for (const fileName of files) {
            const pathName = join(dirName, fileName);
            const fileStat = await stat(pathName);

            if (fileStat.isDirectory()) {
                await scanDirAndRenameJSFiles(pathName, newExt);
            }

            const ext = extname(pathName);
            const newPathName = ext === '.js'
                ? _changeFileExt(pathName, ext, newExt)
                : void 0
            ;

            console.log('handle file:', pathName, '; ext:', ext, '; newPathName:', newPathName);

            if (newPathName) {
                if (existsSync(newPathName)) {
                    await rm(newPathName);
                }

                if (fileName === 'index.js') {
                    await copyFile(pathName, newPathName);
                }
                else {
                    await rename(pathName, newPathName);
                }
            }
        }
    });
}

(async function() {
    await scanDirAndRenameJSFiles(dirnameForScan, newExt)
})();
