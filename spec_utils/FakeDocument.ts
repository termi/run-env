'use strict';

import { FakeEvent, FakeEventTarget } from "./FakeEventTarget";

export default class FakeDocument extends FakeEventTarget {
    public readonly isFakeDocument = true;

    readonly ownerDocument = null;

    readyState: DocumentReadyState = 'loading';

    setReadyState(readyState: DocumentReadyState) {
        if (readyState === 'complete') {
            this.dispatchOnDOMContentLoaded(false);
        }

        this.readyState = readyState;
    }

    dispatchOnDOMContentLoaded(isUpdateReadyState = true) {
        const event = new FakeEvent('DOMContentLoaded') as Event;
        const result = this.dispatchEvent(event);

        if (isUpdateReadyState) {
            this.setReadyState('complete');
        }

        return result;
    }

    [Symbol.toStringTag] = 'HTMLDocument';
}
