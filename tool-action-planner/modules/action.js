import {fromNow, getPseudoUniqueId} from './abstract.js'

class Action {
    constructor(type, subject, sourceName, sourceLotId, destinationName, destinationLotId) {
        this.id = getPseudoUniqueId();
        this.createdDate = new Date();
        this.finalizedDate = null;
        this.state = ACTION_STATE.QUEUED; // default state for new actions
        this.type = type; // expecting "ACTION_TYPE" value
        this.subject = subject; // string - e.g. "Hydrogen" for "ACTION_TYPE.EXTRACT"
        this.sourceName = sourceName; // string - e.g. "Extractor" for "ACTION_TYPE.EXTRACT"
        this.sourceLotId = sourceLotId; // number
        this.destinationName = destinationName; // string - e.g. "Warehouse" for "ACTION_TYPE.EXTRACT"
        this.destinationLotId = destinationLotId; // number
        this.ready = false;
    }

    markReady() {
        this.ready = true;
    }

    markFinalized() {
        this.finalizedDate = new Date();
    }

    setState(state) {
        this.state = state;
    }

    getListItemHtml() {
        const readyClass = this.ready ? 'ready' : '';
        let destinationHtml = '';
        if (this.destinationName) {
            destinationHtml = /*html*/ `
                <span class="prefix">${ACTION_TYPE_PREFIX[this.type].destination}:</span>
                <span class="value">${this.destinationName} #${this.destinationLotId}</span>
            `;
        }
        let timerHtml = '';
        let subactionText = '';
        let subactionIconsHtml = '';
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                if (this.ready) {
                    subactionText = 'Ready to start';
                    subactionIconsHtml = /*html*/ `
                        <div class="icon-button icon-arrow-right"></div>
                    `;
                } else {
                    subactionText = 'Move in queue';
                    subactionIconsHtml = /*html*/ `
                        <div class="icon-button icon-arrow-up"></div>
                        <div class="icon-button icon-arrow-down"></div>
                    `;
                }
                break;
            case ACTION_STATE.ONGOING:
                if (this.ready) {
                    subactionText = 'Ready to finalize';
                    subactionIconsHtml = /*html*/ `
                        <div class="icon-button icon-arrow-right"></div>
                    `;
                } else {
                    subactionText = 'Cancel';
                    subactionIconsHtml = /*html*/ `
                        <div class="icon-button icon-arrow-right"></div>
                    `;
                    timerHtml = /*html*/ `
                        <span class="prefix highlight-text-pulse">T-minus:</span>
                        <span class="value highlight-text-pulse">5 hours</span>
                    `;
                }
                break;
            case ACTION_STATE.DONE:
                subactionText = 'Dismiss';
                subactionIconsHtml = /*html*/ `
                    <div class="icon-button icon-arrow-right"></div>
                `;
                timerHtml = /*html*/ `
                    <span class="prefix">Done:</span>
                    <span class="value">${fromNow(this.finalizedDate)}</span>
                `;
                break;
        }
        return /*html*/ `
            <li id="action_${this.id}" class="action ${readyClass}">
                <div class="item-title">
                    <div class="icon-round ${ACTION_TYPE_ICON_CLASS[this.type]}"></div>
                    <div class="item-title-text">${ACTION_TYPE_TEXT[this.type]}: ${this.subject}</div>
                </div>
                <div class="item-expand">
                    <div class="action-details">
                        <span class="prefix">${ACTION_TYPE_PREFIX[this.type].source}:</span>
                        <span class="value">${this.sourceName} #${this.sourceLotId}</span>
                        ${destinationHtml}
                        ${timerHtml}
                    </div>
                    <div class="action-status">
                        <div class="subaction-text">${subactionText}</div>
                        ${subactionIconsHtml}
                    </div>
                </div>
            </li>
        `;
    }
}

const ACTION_STATE = {
    DONE: 'DONE',
    ONGOING: 'ONGOING',
    QUEUED: 'QUEUED',
    TRANSITIONING: 'TRANSITIONING',
};

const ACTION_TYPE = {
    CONSTRUCT: 'CONSTRUCT',
    CORE_SAMPLE: 'CORE_SAMPLE',
    DECONSTRUCT: 'DECONSTRUCT',
    EXTRACT: 'EXTRACT',
    TRANSFER: 'TRANSFER',
};

const ACTION_TYPE_TEXT = {
    CONSTRUCT: 'Construct',
    CORE_SAMPLE: 'Core Sample',
    DECONSTRUCT: 'Deconstruct',
    EXTRACT: 'Extract',
    TRANSFER: 'Transfer',
};

const ACTION_TYPE_PREFIX = {
    CONSTRUCT: {source: 'At', destination: null},
    CORE_SAMPLE: {source: 'At', destination: null},
    DECONSTRUCT: {source: 'What', destination: 'Into'},
    EXTRACT: {source: 'With', destination: 'Into'},
    TRANSFER: {source: 'From', destination: 'To'},
};

const ACTION_TYPE_ICON_CLASS = {
    CONSTRUCT: 'icon-construct',
    CORE_SAMPLE: 'icon-core-sample',
    DECONSTRUCT: 'icon-deconstruct',
    EXTRACT: 'icon-yield',
    TRANSFER: 'icon-trade',
};

export {Action, ACTION_STATE, ACTION_TYPE};
