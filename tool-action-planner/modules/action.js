import {deleteFromDOM, fromNow, getPseudoUniqueId, msToShortTime} from './abstract.js'
import {leaderLineConnectElements} from './leader-line-utils.js';

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
    LAND: 'LAND',
    LAUNCH: 'LAUNCH',
    TRANSFER: 'TRANSFER',
    TRAVEL: 'TRAVEL',
};

const ACTION_TYPE_TEXT = {
    CONSTRUCT: 'Construct',
    CORE_SAMPLE: 'Core Sample',
    DECONSTRUCT: 'Deconstruct',
    EXTRACT: 'Extract',
    LAND: 'Land', // Land from orbit
    LAUNCH: 'Launch', // Launch to orbit
    TRANSFER: 'Transfer',
    TRAVEL: 'Travel',
};

const ACTION_TYPE_ICON_CLASS = {
    CONSTRUCT: 'icon-construct',
    CORE_SAMPLE: 'icon-core-sample',
    DECONSTRUCT: 'icon-deconstruct',
    EXTRACT: 'icon-yield',
    LAND: 'icon-ship-down',
    LAUNCH: 'icon-ship-up',
    TRANSFER: 'icon-trade',
    TRAVEL: 'icon-ship-right',
};

const ACTION_LIST_ITEM_TRANSITION_DURATION = 300; // milliseconds

class Action {
    constructor(crewId, asteroidId, type, subject, sourceName, sourceId, destinationName, destinationId, duration = null) {
        this.id = getPseudoUniqueId();
        this.createdDate = new Date();
        this.startedDate = null;
        this.finalizedDate = null;
        this.crewId = crewId;
        this.asteroidId = asteroidId;
        this.type = type; // expecting "ACTION_TYPE" value
        this.subject = subject; // string - e.g. "Hydrogen" for "ACTION_TYPE.EXTRACT"
        this.sourceName = sourceName; // string - e.g. "Extractor" for "ACTION_TYPE.EXTRACT"
        this.sourceId = sourceId; // number - e.g. lot ID, or asteroid ID for "ACTION_TYPE.TRAVEL"
        this.destinationName = destinationName; // string - e.g. "Warehouse" for "ACTION_TYPE.EXTRACT"
        this.destinationId = destinationId; // number - e.g. lot ID, or asteroid ID for "ACTION_TYPE.TRAVEL"
        this.duration = duration ? duration : 0; // number as milliseconds
        this.state = ACTION_STATE.QUEUED; // default state for new actions
        this.isReady = false;
        this.elListItem = null;
        this.refreshOngoingInterval = null;
        actionService.actionsById[this.id] = this;
    }

    /** Verify that the active crew and asteroid matches this action */
    isActiveCrewAndAsteroid() {
        return crewService.activeCrew.id === this.crewId && crewService.activeCrew.asteroidId === this.asteroidId;
    }

    handleInvalidCrewOrAsteroid() {
        console.log(`%c--- ERROR: action restricted to crew ID #${crewService.activeCrew.id} on asteroid ID #${crewService.activeCrew.asteroidId}`, 'color: orange;');
    }

    handleCrewOnCooldown() {
        alert('Crew not ready'); //// TEST
    }

    updateListItemSubactions() {
        if (this.isReady) {
            const elSubactionsCellRemove = this.elListItem.querySelector('.subactions-cell-remove');
            if (elSubactionsCellRemove) {
                // Replace [remove] cell with [transition] cell
                elSubactionsCellRemove.classList.remove('subactions-cell-remove');
                elSubactionsCellRemove.classList.add('subactions-cell-transition');
                switch (this.state) {
                    case ACTION_STATE.QUEUED:
                        // Queued action ready => replace "Remove" with "Start"
                        elSubactionsCellRemove.innerHTML = /*html*/ `
                            <div>Start</div>
                            <div class="icon-button icon-arrow-right" onclick="onTransitionActionById('${this.id}')"></div>
                        `;
                        break;
                    case ACTION_STATE.ONGOING:
                        // Ongoing action ready => replace "Cancel" with "Finalize"
                        elSubactionsCellRemove.innerHTML = /*html*/ `
                            <div>Finalize</div>
                            <div class="icon-button icon-arrow-right" onclick="onTransitionActionById('${this.id}')"></div>
                        `;
                        break;
                }
            }
            const elSubactionsCellDrag = this.elListItem.querySelector('.subactions-cell-drag');
            if (elSubactionsCellDrag) {
                // Action ready => remove "drag" subaction (typically only for queued actions)
                elSubactionsCellDrag.classList.remove('subactions-cell-drag');
                elSubactionsCellDrag.innerHTML = '';
            }
        }
    }

    markReady() {
        if (!this.isActiveCrewAndAsteroid()) {
            this.handleInvalidCrewOrAsteroid();
            return;
        }
        if (this.isReady) {
            console.log(`%c--- ERROR: action is already ready => can NOT mark as ready`, 'color: orange;');
            return;
        }
        this.isReady = true;
        if (this.elListItem) {
            this.elListItem.classList.add('ready');
            this.updateListItemSubactions();
            if (this.state === ACTION_STATE.ONGOING) {
                // Remove timer for ongoing action which has become ready
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
        if (!this.isActiveCrewAndAsteroid()) {
            this.handleInvalidCrewOrAsteroid();
            return;
        }
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
        for (const [actionId, action] of Object.entries(actionService.actionsById)) {
            // Parse only other actions which are ongoing and not ready
            if (action.id === this.id || action.state !== ACTION_STATE.ONGOING || action.isReady) {
                continue;
            }
            const otherTimeRemainingMs = actionService.actionsById[action.id].getOngoingTimeRemainingMs();
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
        const draggableAttribute = this.state === ACTION_STATE.QUEUED && !this.isReady ? 'draggable="true"' : '';
        let destinationHtml = '';
        if (this.destinationName) {
            destinationHtml = /*html*/ `
                <div class="value value-destination">${this.destinationName} #${this.destinationId}</div>
            `;
        }
        let timerCompactHtml = '';
        let subactionsHtml = '';
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                if (this.isReady) {
                    subactionsHtml = /*html*/ `
                        <div class="subactions-cell"></div>
                        <div class="subactions-cell subactions-cell-transition">
                            <div>Start</div>
                            <div class="icon-button icon-arrow-right" onclick="onTransitionActionById('${this.id}')"></div>
                        </div>
                    `;
                } else {
                    subactionsHtml = /*html*/ `
                        <div class="subactions-cell subactions-cell-drag">
                            <div class="icon-button icon-move-vertical icon-tooltip icon-tooltip--drag-in-queue"></div>
                        </div>
                        <div class="subactions-cell subactions-cell-remove">
                            <div>Remove</div>
                            <div class="icon-button icon-x" onclick="onRemoveActionById('${this.id}')"></div>
                        </div>
                    `;
                }
                break;
            case ACTION_STATE.ONGOING:
                if (this.isReady) {
                    subactionsHtml = /*html*/ `
                        <div class="subactions-cell"></div>
                        <div class="subactions-cell subactions-cell-transition">
                            <div>Finalize</div>
                            <div class="icon-button icon-arrow-right" onclick="onTransitionActionById('${this.id}')"></div>
                        </div>
                    `;
                } else {
                    const timeRemainingShort = msToShortTime(this.getOngoingTimeRemainingMs());
                    timerCompactHtml = /*html*/ `
                        <div class="timer-compact text-pulse">${timeRemainingShort}</div>
                    `;
                    subactionsHtml = /*html*/ `
                        <div class="subactions-cell"></div>
                        <div class="subactions-cell subactions-cell-remove">
                            <div>Cancel</div>
                            <div class="icon-button icon-x" onclick="onRemoveActionById('${this.id}', true)"></div>
                        </div>
                    `;
                }
                break;
            case ACTION_STATE.DONE:
                subactionsHtml = /*html*/ `
                    <div class="subactions-cell"></div>
                    <div class="subactions-cell subactions-cell-remove">
                        <div>Done ${fromNow(this.finalizedDate)}</div>
                        <div class="icon-button icon-x" onclick="onRemoveActionById('${this.id}')"></div>
                    </div>
                `;
                break;
        }
        return /*html*/ `
            <li id="action_${this.id}" class="${readyClass}" ${draggableAttribute}>
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
                        <div class="value value-source">${this.sourceName} #${this.sourceId}</div>
                        ${destinationHtml}
                    </div>
                    <div class="subactions">
                        ${subactionsHtml}
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
        if (!this.isActiveCrewAndAsteroid()) {
            this.handleInvalidCrewOrAsteroid();
            return;
        }
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

    setCrewCooldownBeforeTransition(transitionDuration) {
        let cooldown = 5 * 1000; // default cooldown 5 seconds
        // Put the crew on cooldown for the entire duration of the action, when starting a "Core Sample"
        if (this.type === ACTION_TYPE.CORE_SAMPLE && this.state === ACTION_STATE.QUEUED) {
            cooldown = this.duration;
        }
        /**
         * Ensure the crew cooldown does not end too soon,
         * due to the animation durations during the transition.
         */
        crewService.activeCrew.startCooldown(cooldown + transitionDuration, this.id);
    }

    prepareListItemForAnimating() {
        this.elListItem.classList.add('animating');
        const elListItemHeight = this.elListItem.getBoundingClientRect().height;
        const elListItemWidth = this.elListItem.getBoundingClientRect().width;
        this.elListItem.style.setProperty('--this-height', `${elListItemHeight}px`);
        this.elListItem.style.setProperty('--this-width', `${elListItemWidth}px`);
        this.elListItem.style.setProperty('--half-slide-duration', `${ACTION_LIST_ITEM_TRANSITION_DURATION}ms`);
        // Wrap the list item content into a new element ".slider"
        this.elListItem.innerHTML = /*html*/ `<div class="slider">${this.elListItem.innerHTML}</div>`;
    }

    flashListItem() {
        const transitionFlashDuration = 1000; // milliseconds
        this.elListItem.style.setProperty('--transition-flash-duration', `${transitionFlashDuration}ms`);
        this.elListItem.classList.add('transition-flash');
        setTimeout(() => {
            this.elListItem.classList.remove('transition-flash');
        }, transitionFlashDuration);
    }

    removeListItem() {
        deleteFromDOM(this.elListItem);
        if (this.refreshOngoingInterval) {
            this.clearRefreshOngoingInterval();
        }
    }

    removeAction() {
        // Queued actions can be removed without the need for the crew to be active and on the same asteroid
        if (!this.isActiveCrewAndAsteroid() && this.state !== ACTION_STATE.QUEUED) {
            this.handleInvalidCrewOrAsteroid();
            return;
        }
        if (crewService.activeCrew.cooldown && this.state === ACTION_STATE.ONGOING) {
            /**
             * The only ongoing action that can be canceled while the crew is on cooldown,
             * is the action that triggered the cooldown (e.g. a "Core Sample" action can be canceled
             * while the crew is "locked" to that action, thus also clearing the crew cooldown).
             */
            if (this.id === crewService.activeCrew.cooldownActionId) {
                crewService.activeCrew.clearCooldown();
            } else {
                this.handleCrewOnCooldown();
                return;
            }
        }
        this.prepareListItemForAnimating();
        // Fade out the list item, then slide it up
        this.elListItem.classList.add('fade-out');
        setTimeout(() => {
            // Done fading out => start sliding up
            this.elListItem.classList.add('slide-up');
            setTimeout(() => {
                // Done sliding up => remove the list item
                this.removeListItem();
                // Remove global reference
                delete actionService.actionsById[this.id];
            }, ACTION_LIST_ITEM_TRANSITION_DURATION);
        }, ACTION_LIST_ITEM_TRANSITION_DURATION);
    }

    transitionAction() {
        if (!this.isActiveCrewAndAsteroid()) {
            this.handleInvalidCrewOrAsteroid();
            return;
        }
        if (crewService.activeCrew.cooldown) {
            // Actions can not be transitioned while the crew is on cooldown
            this.handleCrewOnCooldown();
            return;
        }
        if (!this.isReady) {
            console.log(`%c--- ERROR: action not ready => can NOT transition`, 'color: orange;');
            return;
        }
        if (this.state === ACTION_STATE.DONE) {
            console.log(`%c--- ERROR: action already done => can NOT transition`, 'color: orange;');
            return;
        }
        /**
         * The action is actually transitioned after 2 animations of
         * "ACTION_LIST_ITEM_TRANSITION_DURATION" each (see "setTimeout" calls below).
         */
        this.setCrewCooldownBeforeTransition(ACTION_LIST_ITEM_TRANSITION_DURATION * 2);
        let nextState;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                nextState = ACTION_STATE.ONGOING;
                break;
            case ACTION_STATE.ONGOING:
                nextState = ACTION_STATE.DONE;
                break;
        }
        this.prepareListItemForAnimating();
        // Slide right the ".slider", then slide up the list item
        this.elListItem.querySelector('.slider').classList.add('slide-right');
        this.elListItem.classList.add('fade-background');
        setTimeout(() => {
            // Done sliding right => start sliding up
            this.elListItem.classList.add('slide-up');
            setTimeout(() => {
                // Done sliding up => remove the list item from the old action-group
                this.removeListItem();
                // Update the properties of the action, and inject it into the new action-group
                this.isReady = false;
                this.setState(nextState);
                if (this.state === ACTION_STATE.DONE) {
                    this.markFinalized();
                }
                this.injectListItem();
                this.flashListItem();
                if (this.state === ACTION_STATE.ONGOING) {
                    // Current action is now ongoing => mark the next queued action as ready
                    //// TO DO: rework to properly update the readiness of queued actions, based on lots / action types
                    actionService.markNextQueuedActionReady();
                }
            }, ACTION_LIST_ITEM_TRANSITION_DURATION);
        }, ACTION_LIST_ITEM_TRANSITION_DURATION);
    }
}

class ActionService {
    constructor() {
        this.actionsById = {};
    }

    getActionForListItem(elListItem) {
        const actionId = elListItem.id.replace('action_', '');
        return this.actionsById[actionId];
    }

    markNextQueuedActionReady() {
        const nextQueuedActionNotReady = document.querySelector('#actions-queued ul li:not(.ready)');
        if (nextQueuedActionNotReady) {
            const action = this.getActionForListItem(nextQueuedActionNotReady);
            action.markReady();
        }
    }

    /**
     * Based on: https://www.youtube.com/watch?v=jfYWwQrtzzY
     */
    updateQueuedDraggables() {
        const container = document.querySelector('#actions-queued ul');
        const draggables = container.querySelectorAll('li:not(.ready)');
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => {
                container.classList.add('dragging-wrapper');
                draggable.classList.add('dragging');
            });
            draggable.addEventListener('dragend', () => {
                container.classList.remove('dragging-wrapper');
                draggable.classList.remove('dragging');
                const action = this.getActionForListItem(draggable);
                action.flashListItem();
            });
        });
        container.addEventListener('dragover', event => {
            // Prevent default to allow drop (does not seem to be required in Firefox, but keeping it, just to be safe)
            event.preventDefault();
            const listItemDragging = container.querySelector('.dragging');
            const listItemNext = this.getListItemAfterTheOneBeingDragged(container, event.clientY);
            if (listItemNext === null) {
                // List item being dragged is below all draggables
                container.appendChild(listItemDragging);
            } else {
                container.insertBefore(listItemDragging, listItemNext);
            }
        });
    }

    getListItemAfterTheOneBeingDragged(container, y) {
        const elsDraggable = [...container.querySelectorAll('[draggable]:not(.dragging)')];
        return elsDraggable.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height;
            if (offset < 0 && offset > closest.offset) {
                // Dragging above a child
                return {
                    offset: offset,
                    element: child,
                };
            } else {
                return closest;
            }
        }, {offset: Number.NEGATIVE_INFINITY}).element;
    }
}

// Global variables and functions

globalThis.actionService = new ActionService();

globalThis.onRemoveActionById = function(actionId, shouldConfirm = false) {
    if (shouldConfirm && !confirm('Are you sure you want to remove this action?')) {
        return false;
    }
    actionService.actionsById[actionId]?.removeAction();
};

globalThis.onTransitionActionById = function(actionId) {
    actionService.actionsById[actionId]?.transitionAction();
}

export {Action, ACTION_STATE, ACTION_TYPE};
