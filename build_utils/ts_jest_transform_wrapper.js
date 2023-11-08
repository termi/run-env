'use strict';

// todo: Пример трансформера https://github.com/swc-project/jest/blob/master/index.ts
//  https://www.npmjs.com/package/@swc/jest/v/0.2.17?activeTab=code

let tra;

module.exports = {
    process(sourceText, sourcePath, options) {
        if (!tra) {
            const { createTransformer } = require('ts-jest').default;

            tra = createTransformer();
        }

        return tra.process(sourceText, sourcePath, options);
    },
};
