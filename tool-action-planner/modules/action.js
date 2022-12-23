import {fromNow, getPseudoUniqueId} from './abstract.js'
import {leaderLineConnectElements} from './leader-line-utils.js';

class Action {
    constructor(type, subject, sourceName, sourceLotId, destinationName, destinationLotId, duration = 0) {
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
        this.duration = duration; // number as milliseconds
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
        if (state === ACTION_STATE.DONE) {
            this.markFinalized();
        }
    }

    getListItemHtml() {
        const readyClass = this.ready ? 'ready' : '';
        let destinationHtml = '';
        if (this.destinationName) {
            destinationHtml = /*html*/ `
                <div class="value value-destination">${this.destinationName} #${this.destinationLotId}</div>
            `;
        }
        let timerCompactHtml = '';
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
                        <div class="icon-button icon-x"></div>
                    `;
                    const hoursAgo = Math.round(this.duration / (3600 * 1000));
                    timerCompactHtml = /*html*/ `
                        <div class="timer-compact text-pulse">${hoursAgo}h</div>
                    `;
                }
                break;
            case ACTION_STATE.DONE:
                subactionText = `Done ${fromNow(this.finalizedDate)}`;
                subactionIconsHtml = /*html*/ `
                    <div class="icon-button icon-x"></div>
                `;
                break;
        }
        return /*html*/ `
            <li id="action_${this.id}" class="action ${readyClass}">
                <div class="item-title">
                    <div class="icon-round ${ACTION_TYPE_ICON_CLASS[this.type]}"></div>
                    <div class="item-title-text">
                        <span class="action-type-text">${ACTION_TYPE_TEXT[this.type]}:</span>
                        ${this.subject}
                    </div>
                    ${timerCompactHtml}
                </div>
                <div class="item-expand">
                    <div class="action-details">
                        <div class="value value-source">${this.sourceName} #${this.sourceLotId}</div>
                        ${destinationHtml}
                    </div>
                    <div class="action-status">
                        <div class="subaction-text">${subactionText}</div>
                        ${subactionIconsHtml}
                    </div>
                </div>
            </li>
        `;
    }

    injectListItem() {
        let elActionGroup;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                elActionGroup = document.getElementById('actions-queued');
                break;
            case ACTION_STATE.ONGOING:
                elActionGroup = document.getElementById('actions-ongoing');
                break;
            case ACTION_STATE.DONE:
                elActionGroup = document.getElementById('actions-done');
                break;
        }
        elActionGroup.querySelector('ul').innerHTML += this.getListItemHtml();
        const elListItem = document.getElementById(`action_${this.id}`);
        const elDestination = elListItem.querySelector('.value-destination');
        if (elDestination) {
            // Inject Leader Line from source to destination
            const elSource = elListItem.querySelector('.value-source');
            leaderLineConnectElements(elSource, elDestination);        
        }
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