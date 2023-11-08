'use strict';

require('./build_utils/ts-node_loader').registerTSNodeAutoLoader({
    cacheDirName: './build_cache/ts-node/',
    // compilerModuleName: 'ttypescript',
});

globalThis["__USE_JSDOM__"] = true;

module.exports = require('./jest.config.main');
