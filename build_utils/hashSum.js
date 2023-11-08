'use strict';

// Based on https://github.com/bevacqua/hash-sum

Object.defineProperty(exports, "__esModule", { value: true });

function fold(hash, text) {
    if (text.length === 0) {
        return hash;
    }
    for (let i = 0, len = text.length; i < len; i++) {
        // eslint-disable-next-line unicorn/prefer-code-point
        const chr = text.charCodeAt(i);

        // eslint-disable-next-line unicorn/prefer-math-trunc,@typescript-eslint/no-magic-numbers
        hash = (((hash << 5) - hash) + chr) | 0;
    }

    // eslint-disable-next-line no-magic-numbers
    return hash < 0 ? hash * -2 : hash;
}

function foldObject(hash, o, seen, ignoreUndefinedValues) {
    return Object.keys(o).sort().reduce(foldKey, hash);
    function foldKey(hash, key) {
        const value = o[key];

        if (ignoreUndefinedValues && value === void 0) {
            return hash;
        }

        return foldValue(hash, value, key, seen, ignoreUndefinedValues);
    }
}

function foldValue(input, value, key, seen, ignoreUndefinedValues) {
    const hash = fold(fold(fold(input, key), toString(value)), typeof value);

    if (value === null) {
        return fold(hash, 'null');
    }
    if (value === undefined) {
        return fold(hash, 'undefined');
    }
    if (typeof value === 'object' || typeof value === 'function') {
        if (seen.includes(value)) {
            // eslint-disable-next-line prefer-template
            return fold(hash, '[Circular]' + key);
        }

        seen.push(value);

        const objHash = foldObject(hash, value, seen, ignoreUndefinedValues);

        if (!('valueOf' in value) || typeof value.valueOf !== 'function') {
            return objHash;
        }
        try {
            return fold(objHash, String(value.valueOf()));
        }
        catch (err) {
            // eslint-disable-next-line prefer-template
            return fold(objHash, '[valueOf exception]' + _errMessage(err));
        }
    }

    return fold(hash, value.toString());
}

function toString(o) {
    return Object.prototype.toString.call(o);
}

function _errMessage(err) {
    if (err) {
        if (typeof err === 'object') {
            return (err.stack || err.message) || String(err);
        }

        return String(err);
    }

    return String(err || '') || '';
}
/**
 * @param o - any value
 * @param ignoreUndefinedValues - ignore undefined values in objects
 */
function hashSum(o, { ignoreUndefinedValues = false } = {}) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return foldValue(0, o, '', [], ignoreUndefinedValues).toString(16).padStart(8, '0');
}

exports.default = hashSum;
