'use strict';

const {
    // stat,
    copyFile,
    // readdir,
    writeFile,
    // mkdir,
} = require('node:fs/promises');
const {
    join,
    // basename,
    // dirname,
} = require('node:path');

async function _copyPackageJSON(targetDir) {
    const packageJSON = require(join(__dirname, '../', 'package.json'));

    delete packageJSON["devDependencies"];
    delete packageJSON["scripts"];

    Object.assign(packageJSON, {
        "type": "module",
        "main": "./dist/mjs/index.mjs",
        "module": "./dist/mjs/index.mjs",
        "ts-module": "./index.ts",
        "exports": {
            "main": "./index.ts",
            "transpile": "./index.ts",
            "import": "./dist/mjs/index.mjs",
            "require": "./dist/cjs/index.cjs",
            "ts-import": "./index.ts",
            "browser": "./dist/cjs/index.cjs",
            "types": "./dist/mjs/index.d.ts"
        },
    });

    await writeFile(join(targetDir, 'package.json'), JSON.stringify(packageJSON, null, '\t'));
}

/*
async function _copyDir(dirName, targetDirName) {
    targetDirName = join(targetDirName, basename(dirName));

    const files = await readdir(dirName);

    await mkdir(targetDirName, { recursive: true });

    for (const file of files) {
        const fullSourcePath = join(dirName, file);
        const fullTargetPath = join(targetDirName, file);
        const stats = await stat(fullSourcePath);

        if (stats.isDirectory()) {
            await _copyDir(fullSourcePath, join(fullTargetPath, '..'));

            continue;
        }

        console.info('copy file from', fullSourcePath, 'to', fullTargetPath)

        await copyFile(fullSourcePath, fullTargetPath);
    }
}
*/

async function main() {
    await _copyPackageJSON('../build');

    await copyFile('../index.ts', '../build/index.ts');
    await copyFile('../runEnv.ts', '../build/runEnv.ts');
    await copyFile('../README.md', '../build/README.md');

//    await _copyDir('../dist', '../build');
}

(async function() {
    const currentDir = process.cwd();

    process.chdir(__dirname);

    await main();

    process.chdir(currentDir);

    process.exit(0);
})();
