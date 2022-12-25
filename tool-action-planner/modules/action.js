import {
    deleteFromDOM,
    fromNow,
    getPseudoUniqueId,
    msToShortTime,
} from './abstract.js'
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
        this.isReady = false;
        this.elListItem = null;
        this.refreshOngoingInterval = null;
        actionsById[this.id] = this;
    }

    updateListItemStatus() {
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                if (this.isReady) {
                    // Replace "Remove" button with "Ready to start" button
                    const elActionStatus = this.elListItem.querySelector('.action-status');
                    elActionStatus.innerHTML = /*html*/ `
                        <div class="subaction-text">Ready to start</div>
                        <div class="icon-button icon-arrow-right" onclick="transitionActionById('${this.id}')"></div>
                    `;
                }
                break;
            case ACTION_STATE.ONGOING:
                if (this.isReady) {
                    // Replace "Remove" button with "Ready to finalize" button
                    const elActionStatus = this.elListItem.querySelector('.action-status');
                    elActionStatus.innerHTML = /*html*/ `
                        <div class="subaction-text">Ready to finalize</div>
                        <div class="icon-button icon-arrow-right" onclick="transitionActionById('${this.id}')"></div>
                    `;
                }
                break;
        }
    }

    markReady() {
        if (this.isReady) {
            console.log(`%c--- ERROR: action is already ready => can NOT mark as ready`, 'color: orange;');
            return;
        }
        this.isReady = true;
        if (this.elListItem) {
            this.elListItem.classList.add('ready');
            this.updateListItemStatus();
            if (this.state === ACTION_STATE.ONGOING) {
                const elTimerCompact = this.elListItem.querySelector('.timer-compact');
                deleteFromDOM(elTimerCompact);
                this.clearRefreshOngoingInterval();
            }
        }
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

    clearRefreshOngoingInterval() {
        if (this.refreshOngoingInterval) {
            clearInterval(this.refreshOngoingInterval);
        }
        this.refreshOngoingInterval = null;
    }

    getOngoingTimeRemainingMs() {
        if (this.state !== ACTION_STATE.ONGOING || this.isReady || !this.startedDate) {
            return null;
        }
        return this.startedDate.getTime() + this.duration - Date.now();
    }

    getNextLongestOngoingAction() {
        const thisTimeRemainingMs = this.getOngoingTimeRemainingMs();
        let nextLongestOngoingAction = null;
        for (const [actionId, action] of Object.entries(actionsById)) {
            // Parse only other actions which are ongoing and not ready
            if (action.id === this.id || action.state !== ACTION_STATE.ONGOING || action.isReady) {
                continue;
            }
            const otherTimeRemainingMs = actionsById[action.id].getOngoingTimeRemainingMs()
            if (otherTimeRemainingMs && otherTimeRemainingMs > thisTimeRemainingMs) {
                // Found other longer ongoing action => check if shorter than the currently-saved "nextLongestOngoingAction"
                if (!nextLongestOngoingAction) {
                    nextLongestOngoingAction = action;
                    continue;
                }
                if (otherTimeRemainingMs < nextLongestOngoingAction.getOngoingTimeRemainingMs()) {
                    nextLongestOngoingAction = action;
                }
            }
        }
        return nextLongestOngoingAction;
    }

    getListItemHtml() {
        const readyClass = this.isReady ? 'ready' : '';
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
                if (this.isReady) {
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
                if (this.isReady) {
                    subactionText = 'Ready to finalize';
                    subactionIconsHtml = /*html*/ `
                        <div class="icon-button icon-arrow-right" onclick="transitionActionById('${this.id}')"></div>
                    `;
                } else {
                    const timeRemainingShort = msToShortTime(this.getOngoingTimeRemainingMs());
                    timerCompactHtml = /*html*/ `
                        <div class="timer-compact text-pulse">${timeRemainingShort}</div>
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

    refreshOngoingTime() {
        if (this.state !== ACTION_STATE.ONGOING) {
            console.log(`%c--- ERROR: action not ongoing => can NOT refresh time`, 'color: orange;');
            this.clearRefreshOngoingInterval();
            return;
        }
        if (this.isReady) {
            console.log(`%c--- WARNING: action ready => can NOT refresh time`, 'color: yellow;');
            return;
        }
        const timeRemainingShort = msToShortTime(this.getOngoingTimeRemainingMs());
        if (!timeRemainingShort) {
            // Ongoing action is now ready
            this.markReady();
            return;
        }
        const elTimerCompact = this.elListItem.querySelector('.timer-compact');
        if (elTimerCompact.textContent !== timeRemainingShort) {
            elTimerCompact.textContent = timeRemainingShort;
        }
    }

    injectListItem() {
        let actionGroupList;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                actionGroupList = document.querySelector('#actions-queued ul');
                break;
            case ACTION_STATE.ONGOING:
                actionGroupList = document.querySelector('#actions-ongoing ul');
                break;
            case ACTION_STATE.DONE:
                actionGroupList = document.querySelector('#actions-done ul');
                break;
        }
        const elTemp = document.createElement('div');
        elTemp.innerHTML = this.getListItemHtml();
        this.elListItem = elTemp.firstElementChild;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                actionGroupList.append(this.elListItem);
                break;
            case ACTION_STATE.ONGOING:
                // Inject before the next-longest ongoing action
                const nextLongestOngoingAction = this.getNextLongestOngoingAction();
                if (nextLongestOngoingAction) {
                    nextLongestOngoingAction.elListItem.insertAdjacentElement('beforebegin', this.elListItem);
                } else {
                    // This is the new longest ongoing action
                    actionGroupList.append(this.elListItem);
                }
                break;
            case ACTION_STATE.DONE:
                actionGroupList.prepend(this.elListItem);
                break;
        }
        const elDestination = this.elListItem.querySelector('.value-destination');
        if (elDestination) {
            // Inject Leader Line from source to destination
            const elSource = this.elListItem.querySelector('.value-source');
            leaderLineConnectElements(elSource, elDestination);
        }
        if (this.state === ACTION_STATE.ONGOING && !this.isReady) {
            /**
             * Use arrow function re: "this" problem
             * Source: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#a_possible_solution
             */
            this.refreshOngoingInterval = setInterval(() => this.refreshOngoingTime(), 1000); // refresh every 1 second
        }
    }

    removeListItem() {
        deleteFromDOM(this.elListItem);
        if (this.refreshOngoingInterval) {
            this.clearRefreshOngoingInterval();
        }
    }

    removeAction() {
        this.removeListItem();
        // Remove global reference
        delete actionsById[this.id];
    }

    transitionAction() {
        if (!this.isReady) {
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
        // Prepare the list item element for sliding
        const elListItemHeight = this.elListItem.getBoundingClientRect().height;
        const elListItemWidth = this.elListItem.getBoundingClientRect().width;
        const halfSlideDuration = 300; // milliseconds
        this.elListItem.style.setProperty('--this-height', `${elListItemHeight}px`);
        this.elListItem.style.setProperty('--this-width', `${elListItemWidth}px`);
        this.elListItem.style.setProperty('--half-slide-duration', `${halfSlideDuration}ms`);
        // Wrap the list item content into a new element ".slider", and animate it to the right, then up
        this.elListItem.innerHTML = /*html*/ `<div class="slider slide-right">${this.elListItem.innerHTML}</div>`;
        this.elListItem.classList.add('sliding', 'fade-background');
        setTimeout(() => {
            // Done sliding to the right => start sliding up
            this.elListItem.classList.add('slide-up');
            setTimeout(() => {
                // Done sliding up => remove the action from the old action-group
                this.removeListItem();
                // Update the status of the action, and inject it into the new action-group
                this.isReady = false;
                this.setState(nextState);
                if (this.state === ACTION_STATE.DONE) {
                    this.markFinalized();
                }
                this.injectListItem();
                // Flash the newly injected list item
                const transitionFlashDuration = 1000; // milliseconds
                this.elListItem.style.setProperty('--transition-flash-duration', `${transitionFlashDuration}ms`);
                this.elListItem.classList.add('transition-flash');
                setTimeout(() => {
                    this.elListItem.classList.remove('transition-flash');
                }, transitionFlashDuration);
                // Mark the next queued action as ready, if the current action is now ongoing
                if (this.state === ACTION_STATE.ONGOING) {
                    markNextQueuedActionReady();
                }
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

function markNextQueuedActionReady() {
    const nextQueuedActionNotReady = document.querySelector('#actions-queued ul li:not(.ready)');
    if (nextQueuedActionNotReady) {
        const actionId = nextQueuedActionNotReady.id.replace('action_', '');
        const action = actionsById[actionId];
        action.markReady();
    }
}

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
