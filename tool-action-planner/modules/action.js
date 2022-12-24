import {fromNow, getPseudoUniqueId} from './abstract.js'
import {leaderLineConnectElements} from './leader-line-utils.js';

class Action {
    constructor(type, subject, sourceName, sourceLotId, destinationName, destinationLotId, duration = null) {
        this.id = getPseudoUniqueId();
        this.createdDate = new Date();
        this.startedDate = null;
        this.finalizedDate = null;
        this.state = ACTION_STATE.QUEUED; // default state for new actions
        this.type = type; // expecting "ACTION_TYPE" value
        this.subject = subject; // string - e.g. "Hydrogen" for "ACTION_TYPE.EXTRACT"
        this.sourceName = sourceName; // string - e.g. "Extractor" for "ACTION_TYPE.EXTRACT"
        this.sourceLotId = sourceLotId; // number
        this.destinationName = destinationName; // string - e.g. "Warehouse" for "ACTION_TYPE.EXTRACT"
        this.destinationLotId = destinationLotId; // number
        this.duration = duration ? duration : 0; // number as milliseconds
        this.ready = false;
    }

    markReady() {
        this.ready = true;
    }

    markStarted() {
        this.startedDate = new Date();
    }

    markFinalized() {
        this.finalizedDate = new Date();
    }

    setState(state) {
        this.state = state;
        if (state === ACTION_STATE.ONGOING) {
            this.markStarted();
        }
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
                        <div class="icon-button icon-arrow-right" onclick="transitionActionById('${this.id}')"></div>
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
                        <div class="icon-button icon-arrow-right" onclick="transitionActionById('${this.id}')"></div>
                    `;
                } else {
                    //// TO DO: calculate hours remaining as "duration" MINUS [time passed since "startedDate"], MIN 0
                    const hoursRemaining = Math.round(this.duration / (3600 * 1000));
                    timerCompactHtml = /*html*/ `
                        <div class="timer-compact text-pulse">${hoursRemaining}h</div>
                    `;
                    subactionText = 'Remove';
                    subactionIconsHtml = /*html*/ `
                        <div class="icon-button icon-x" onclick="removeActionById('${this.id}', true)"></div>
                    `;
                }
                break;
            case ACTION_STATE.DONE:
                subactionText = `Done ${fromNow(this.finalizedDate)}`;
                subactionIconsHtml = /*html*/ `
                    <div class="icon-button icon-x" onclick="removeActionById('${this.id}')"></div>
                `;
                break;
        }
        return /*html*/ `
            <li id="action_${this.id}" class="${readyClass}">
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
        const elTemp = document.createElement('div');
        elTemp.innerHTML = this.getListItemHtml();
        const elListItem = elTemp.firstElementChild;
        if (this.state === ACTION_STATE.DONE) {
            elActionGroup.querySelector('ul').prepend(elListItem);
        } else {
            elActionGroup.querySelector('ul').append(elListItem);
            //// TO DO: if action ONGOING => move it to the correct list-index, based on its remaining time
        }
        const elDestination = elListItem.querySelector('.value-destination');
        if (elDestination) {
            // Inject Leader Line from source to destination
            const elSource = elListItem.querySelector('.value-source');
            leaderLineConnectElements(elSource, elDestination);
        }
    }

    getListItem() {
        return document.getElementById(`action_${this.id}`);
    }

    removeListItem() {
        const elListItem = this.getListItem();
        elListItem.parentElement.removeChild(elListItem);
    }

    removeAction() {
        this.removeListItem();
        // Remove global reference
        delete actionsById[this.id];
    }

    transitionAction() {
        if (!this.ready) {
            console.log(`%c--- ERROR: action not ready => can NOT transition`, 'color: orange;');
            return;
        }
        if (this.state === ACTION_STATE.DONE) {
            console.log(`%c--- ERROR: action already done => can NOT transition`, 'color: orange;');
            return;
        }
        let nextState;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                nextState = ACTION_STATE.ONGOING;
                break;
            case ACTION_STATE.ONGOING:
                nextState = ACTION_STATE.DONE;
                break;
        }
        // Step 1: prepare the "li" element for sliding
        const elListItem = this.getListItem();
        const elListItemHeight = elListItem.getBoundingClientRect().height;
        const elListItemWidth = elListItem.getBoundingClientRect().width;
        const halfSlideDuration = 300; // milliseconds
        elListItem.style.setProperty("--this-height", `${elListItemHeight}px`);
        elListItem.style.setProperty("--this-width", `${elListItemWidth}px`);
        elListItem.style.setProperty("--half-slide-duration", `${halfSlideDuration}ms`);
        // Step 2: wrap the content of "li", into a new element "div.slider", and animate it to the right, then up
        elListItem.innerHTML = /*html*/ `<div class="slider slide-right">${elListItem.innerHTML}</div>`;
        elListItem.classList.add('sliding', 'fade-background');
        setTimeout(() => {
            // Done sliding to the right => start sliding up
            elListItem.classList.add('slide-up');
            setTimeout(() => {
                // Done sliding up => remove the action from the old action-group
                this.removeListItem();
                // Step 3: update the status of the action, and inject it into the new action-group
                this.ready = false;
                this.setState(nextState);
                if (this.state === ACTION_STATE.DONE) {
                    this.markFinalized();
                }
                this.injectListItem();
                // Step 4: animate the slider "in reverse" as it's inserted in the new action-group (and/or flash it a couple of times?)
                //// TO DO ...
            }, halfSlideDuration);
        }, halfSlideDuration);
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

const ACTION_TYPE_ICON_CLASS = {
    CONSTRUCT: 'icon-construct',
    CORE_SAMPLE: 'icon-core-sample',
    DECONSTRUCT: 'icon-deconstruct',
    EXTRACT: 'icon-yield',
    TRANSFER: 'icon-trade',
};

// Global variables and functions

globalThis.actionsById = {};

globalThis.removeActionById = function(actionId, shouldConfirm = false) {
    if (shouldConfirm && !confirm('Are you sure you want to remove this action?')) {
        return false;
    }
    actionsById[actionId]?.removeAction();
};

globalThis.transitionActionById =  function(actionId) {
    actionsById[actionId]?.transitionAction();
}

export {Action, ACTION_STATE, ACTION_TYPE};
