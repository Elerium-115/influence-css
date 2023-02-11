import {deleteFromDOM, fromNow, getPseudoUniqueId, msToShortTime} from './abstract.js';
import {leaderLineConnectElements} from './leader-line-utils.js';
import {CREW_INVOLVEMENT} from './crew.js';
import {LOT_STATE, LOT_STATE_TEXT_SHORT} from './lot.js';
import {NotificationService} from './notification.js';

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
    REFINE: 'REFINE',
    TRANSFER: 'TRANSFER',
    TRAVEL: 'TRAVEL',
};

const ACTION_TYPE_DATA = {
    CONSTRUCT: {
        ICON_CLASS: 'icon-construct',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 15 * 1000,
        TEXT: 'Construct',
        TEXT_ING: 'Constructing',
    },
    CORE_SAMPLE: {
        ICON_CLASS: 'icon-core-sample',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: false,
        STARTUP_DURATION: 10 * 1000, // Crew presence required for total duration of "Core Sample" => startup duration = total duration
        TEXT: 'Core Sample',
        TEXT_ING: 'Core Sampling',
    },
    DECONSTRUCT: {
        ICON_CLASS: 'icon-deconstruct',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 15 * 1000,
        TEXT: 'Deconstruct',
        TEXT_ING: 'Deconstructing',
    },
    EXTRACT: {
        ICON_CLASS: 'icon-yield',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 5 * 1000,
        TEXT: 'Extract',
        TEXT_ING: 'Extracting',
    },
    LAND: {
        ICON_CLASS: 'icon-ship-down',
        IS_ACTION_ON_LOT: true, // WARNING: "Land" actions will use "sourceId" (NOT "destinationId") as the lot ID to land at
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 5 * 1000,
        TEXT: 'Land', // Land from orbit
        TEXT_ING: 'Landing', // Landing from orbit
    },
    LAUNCH: {
        ICON_CLASS: 'icon-ship-up',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 5 * 1000,
        TEXT: 'Launch', // Launch to orbit
        TEXT_ING: 'Launching', // Launching to orbit
    },
    REFINE: {
        ICON_CLASS: 'icon-refine',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 5 * 1000,
        TEXT: 'Refine',
        TEXT_ING: 'Refining',
    },
    TRANSFER: {
        ICON_CLASS: 'icon-trade',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: false,
        STARTUP_DURATION: 0, // Crew presence not required for action "Transfer" => no cooldown
        TEXT: 'Transfer',
        TEXT_ING: 'Transfering',
    },
    TRAVEL: {
        ICON_CLASS: 'icon-ship-right',
        IS_ACTION_ON_LOT: false, // "Travel" is currently the only action whose source ID is not a lot ID
        IS_EXCLUSIVE_PER_LOT: true,
        STARTUP_DURATION: 5 * 1000,
        TEXT: 'Travel',
        TEXT_ING: 'Traveling',
    },
};

const ACTION_LIST_ITEM_TRANSITION_DURATION = 300; // milliseconds

class Action {
    constructor(
        crewId,
        asteroidId,
        type,
        subject,
        sourceName,
        sourceId,
        destinationName,
        destinationId,
        durationRuntime = null
    ) {
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
        this.durationStartup = ACTION_TYPE_DATA[type].STARTUP_DURATION;
        this.durationRuntime = durationRuntime ? durationRuntime : 0; // number as milliseconds
        this.durationTotal = this.durationStartup + this.durationRuntime;
        this.startupRatio = Math.round(100 * this.durationStartup / this.durationTotal);
        // Ensure startup ratio min. 1%, if non-zero startup duration is much shorter than runtime duration
        if (this.durationStartup > 0) {
            this.startupRatio = Math.max(this.startupRatio, 1);
        }
        // Ensure startup ratio max. 99%, if non-zero runtime duration is much shorter than startup duration
        if (this.durationRuntime > 0) {
            this.startupRatio = Math.min(this.startupRatio, 99);
        }
        this.state = ACTION_STATE.QUEUED; // default state for new actions
        this.isReady = false;
        this.isActionOnLot = ACTION_TYPE_DATA[this.type].IS_ACTION_ON_LOT;
        this.isActionExclusivePerLot = ACTION_TYPE_DATA[this.type].IS_EXCLUSIVE_PER_LOT;
        this.elListItem = null;
        this.refreshOngoingInterval = null;
        this.updateLotsList();
        actionService.actionsById[this.id] = this;
    }

    /** Verify that the active crew and asteroid matches this action */
    isActiveCrewAndAsteroid() {
        return crewService.activeCrew.id === this.crewId && crewService.activeCrew.asteroidId === this.asteroidId;
    }

    handleInvalidCrewOrAsteroid() {
        console.log(`%c--- ERROR: action restricted to crew ID #${crewService.activeCrew.id} on asteroid ID #${crewService.activeCrew.asteroidId}`, 'color: orange;');
    }

    getActionText(includeSource = true, includeDestination = false) {
        const sourceType = this.isActionOnLot ? 'Lot' : 'Asteroid';
        let actionText = `${ACTION_TYPE_DATA[this.type].TEXT}: ${this.subject}`;
        if (includeSource) {
            actionText += ` at ${sourceType} ${this.sourceId} (${this.sourceName})`;
        }
        if (includeDestination && this.destinationId) {
            actionText += `, to ${sourceType} ${this.destinationId} (${this.destinationName})`;
        }
        return actionText;
    }

    getCrewInvolvement() {
        let crewInvolvement = '';
        switch (this.state) {
            case ACTION_STATE.ONGOING:
                if (this.durationStartup && !this.durationRuntime) {
                    // Currently only for Core Sampling
                    crewInvolvement = CREW_INVOLVEMENT.REQUIRED_FOR_DURATION;
                } else {
                    crewInvolvement = CREW_INVOLVEMENT.STARTING;
                }
                break;
            case ACTION_STATE.DONE:
                crewInvolvement = CREW_INVOLVEMENT.FINALIZING;
                break;
        }
        return crewInvolvement;
    }

    handleCrewOnCooldown() {
        /**
         * Warning message format:
         *      Crew not ready due to action:
         *      (Starting) Core Sample: Methane at Lot #4567
         */
        const crewAction = crewService.getActiveCrewAction();
        const messageHtml = /*html*/ `
            Crew not ready due to action:<br>
            <span class="text-highlight">${crewAction.getActionText()} - ${crewAction.getCrewInvolvement()}</span>
        `;
        NotificationService.createNotification(messageHtml, true);
        crewAction.flashListItem();
    }

    markStarted() {
        this.startedDate = new Date();
    }

    markFinalized() {
        this.finalizedDate = new Date();
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
            if (this.state === ACTION_STATE.ONGOING) {
                this.elListItem.classList.remove('startup-in-progress');
                /**
                 * Update list item HTML, in order to:
                 * - remove timer for ongoing action which has become ready
                 * - replace progress bars with "Finalize" button
                 */
                const elTemp = document.createElement('div');
                elTemp.innerHTML = this.getListItemHtml();
                // Updating the HTML in this way is required, otherwise there may be issues e.g. with the transition to "Done"
                this.elListItem.innerHTML = elTemp.firstElementChild.innerHTML;
                this.injectLeaderLineIfNeeded();
                // Update lot action and progress in lots-list
                if (this.isActionOnLot) {
                    const elLotsListItem = document.getElementById(`lot_${this.sourceId}`);
                    const elLotAction = elLotsListItem.querySelector(`.lot-action[data-action-id="${this.id}"]`);
                    elLotAction.classList.add('ready');
                    const elLotActionText = elLotAction.querySelector('.action-text');
                    elLotActionText.classList.remove('startup-in-progress');
                    elLotAction.querySelector('.progress-done').textContent = '';
                    elLotAction.querySelector('.timer-compact').textContent = '';
                }
                this.clearRefreshOngoingInterval();
            }
        }
    }

    markNotReady() {
        if (!this.isActiveCrewAndAsteroid()) {
            this.handleInvalidCrewOrAsteroid();
            return;
        }
        if (!this.isReady) {
            console.log(`%c--- ERROR: action is already not-ready => can NOT mark as not-ready`, 'color: orange;');
            return;
        }
        this.isReady = false;
        if (this.elListItem) {
            this.elListItem.classList.remove('ready');
        }
    }

    setReadyIfDifferent(isReady) {
        if (this.isReady === isReady) {
            // No change needed
            return;
        }
        if (isReady) {
            this.markReady();
        } else {
            this.markNotReady();
        }
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
        this.updateLotsList();
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
        return this.startedDate.getTime() + this.durationTotal - Date.now();
    }

    getNextLongestOngoingAction() {
        const thisTimeRemainingMs = this.getOngoingTimeRemainingMs();
        let nextLongestOngoingAction = null;
        for (const action of Object.values(actionService.actionsById)) {
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
        const draggableAttribute = this.state === ACTION_STATE.QUEUED ? 'draggable="true"' : '';
        let destinationHtml = '';
        if (this.destinationName) {
            destinationHtml = /*html*/ `
                <div class="value value-destination">Lot ${this.destinationId} (${this.destinationName})</div>
            `;
        }
        let timerCompactHtml = '';
        let subactionsHtml = '';
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                subactionsHtml = /*html*/ `
                    <div class="subactions-cell">
                        <div class="icon-button icon-move-vertical icon-tooltip icon-tooltip--drag-in-queue icon-draggable"></div>
                        <div class="icon-button icon-arrow-up-end icon-tooltip icon-tooltip--move-to-top hidden-if-first-list-item" onclick="onMoveToTopOfQueue('${this.id}')"></div>
                    </div>
                    <div class="subactions-cell subactions-cell-remove">
                        <div>Remove</div>
                        <div class="icon-button icon-x" onclick="onRemoveActionById('${this.id}')"></div>
                    </div>
                    <div class="subactions-cell subactions-cell-transition subactions-cell-hidden-if-not-ready">
                        <div>Start</div>
                        <div class="icon-button icon-arrow-right" onclick="onTransitionActionById('${this.id}')"></div>
                    </div>
                `;
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
                    const startupClass = !this.durationStartup ? 'progress-no-startup' : '';
                    const runtimeClass = !this.durationRuntime ? 'progress-no-runtime' : '';
                    const progressPercent = 0;
                    const runtimeRatio = 100 - this.startupRatio;
                    subactionsHtml = /*html*/ `
                        <div class="progress-wrapper ${startupClass} ${runtimeClass}">
                            <div class="progress-done text-pulse">${progressPercent}</div>
                            <div class="progress-bars" style="--progress-done: ${progressPercent}%;">
                                <div class="progress-bar progress-bar--startup" style="width: ${this.startupRatio}%;"></div>
                                <div class="progress-bar progress-bar--runtime" style="width: ${runtimeRatio}%;"></div>
                            </div>
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
                    <div class="icon-round ${ACTION_TYPE_DATA[this.type].ICON_CLASS}"></div>
                    <div class="item-title-text">
                        <span class="action-type-text">${ACTION_TYPE_DATA[this.type].TEXT}:</span>
                        ${this.subject}
                    </div>
                    ${timerCompactHtml}
                </div>
                <div class="item-expand">
                    <div class="action-details">
                        <div class="value value-source">Lot ${this.sourceId} (${this.sourceName})</div>
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
        const ongoingTimeRemainingMs = this.getOngoingTimeRemainingMs();
        const ongoingTimeElapsedMs = this.durationTotal - ongoingTimeRemainingMs;
        // Update time remaining
        const timeRemainingShort = msToShortTime(ongoingTimeRemainingMs);
        if (!timeRemainingShort) {
            // Ongoing action is now ready
            this.markReady();
            return;
        }
        const elTimerCompact = this.elListItem.querySelector('.timer-compact');
        elTimerCompact.textContent = timeRemainingShort;
        // Update progress percent and progress bars
        const progress = Math.round(100 * (ongoingTimeElapsedMs) / this.durationTotal);
        this.elListItem.querySelector('.progress-done').textContent = progress;
        this.elListItem.querySelector('.progress-bars').style.setProperty('--progress-done', `${progress}%`);
        // Mark the list item if non-zero startup duration in progress (i.e. crew on cooldown because of it)
        let isStartupInProgress = false;
        if (this.durationStartup && ongoingTimeElapsedMs < this.durationStartup) {
            this.elListItem.classList.add('startup-in-progress');
            isStartupInProgress = true;
        } else {
            this.elListItem.classList.remove('startup-in-progress');
        }
        // Update lot action and progress in lots-list
        if (this.isActionOnLot) {
            const elLotsListItem = document.getElementById(`lot_${this.sourceId}`);
            if (!elLotsListItem) {
                // The lots-list item must have just been deleted (e.g. via "abandonLotId")
                return;
            }
            const elLotAction = elLotsListItem.querySelector(`.lot-action[data-action-id="${this.id}"]`);
            // Color the action-text based on whether it's in "startup" or "runtime"
            const elLotActionText = elLotAction.querySelector('.action-text');
            if (isStartupInProgress) {
                elLotActionText.classList.add('startup-in-progress');
            } else {
                elLotActionText.classList.remove('startup-in-progress');
            }
            elLotAction.querySelector('.progress-done').textContent = progress;
            elLotAction.querySelector('.timer-compact').textContent = timeRemainingShort;
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
        this.injectLeaderLineIfNeeded();
        if (this.state === ACTION_STATE.ONGOING && !this.isReady) {
            /**
             * Use arrow function re: "this" problem
             * Source: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#a_possible_solution
             */
            this.refreshOngoingInterval = setInterval(() => this.refreshOngoingTime(), 1000); // refresh every 1 second
        }
    }

    injectLeaderLineIfNeeded() {
        const elDestination = this.elListItem.querySelector('.value-destination');
        const elLeaderLine = this.elListItem.querySelector('.leader-line');
        if (elDestination && !elLeaderLine) {
            // Inject Leader Line from source to destination
            const elSource = this.elListItem.querySelector('.value-source');
            leaderLineConnectElements(elSource, elDestination);
        }
    }

    setCrewCooldownBeforeTransition(transitionDuration) {
        let cooldown = 0;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                // Action transitioning from queued to ongoing => default cooldown = startup duration
                cooldown = this.durationStartup;
                if (this.type === ACTION_TYPE.TRAVEL) {
                    cooldown = this.durationTotal;
                }
                break;
            case ACTION_STATE.ONGOING:
                // Action transitioning from ongoing to done => default cooldown = surface travel time for crew
                cooldown = 3 * 1000; //// TEST
                break;
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

    removeAction(forceRemove = false) {
        if (forceRemove) {
            if (this.id === crewService.activeCrew.cooldownActionId) {
                // The action being removed was keeping the crew on cooldown
                crewService.activeCrew.clearCooldown();
            }
        } else {
            // Queued actions can be removed without the need for the crew to be active and on the same asteroid
            if (!this.isActiveCrewAndAsteroid() && this.state !== ACTION_STATE.QUEUED) {
                this.handleInvalidCrewOrAsteroid();
                return;
            }
            if (this.state === ACTION_STATE.ONGOING) {
                // Ongoing actions can not be canceled, as of 2023-01-10
                return;
                //// DISABLED -- START
                // /**
                //  * The only ongoing action that can be canceled while the crew is on cooldown,
                //  * is the action that triggered the cooldown (e.g. a "Core Sample" action can be canceled
                //  * while the crew is "locked" to that action, thus also clearing the crew cooldown).
                //  */
                // if (this.id === crewService.activeCrew.cooldownActionId) {
                //     crewService.activeCrew.clearCooldown();
                // } else {
                //     this.handleCrewOnCooldown();
                //     return;
                // }
                //// DISABLED -- END
            }
        }
        this.cleanupLotsForActionBeingDeleted();
        this.prepareListItemForAnimating();
        // Fade out the list item, then slide it up
        this.elListItem.classList.add('fade-out');
        setTimeout(() => {
            // Done fading out => start sliding up
            this.elListItem.classList.add('slide-up');
            setTimeout(() => {
                // Done sliding up => remove the list item
                this.removeListItem();
                this.clearRefreshOngoingInterval();
                // Remove global reference
                delete actionService.actionsById[this.id];
                // Ensure the top queued action is ready, in case the previously-ready action has just been removed
                actionService.updateQueuedActionsReadiness();
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
        const blockingOngoingAction = this.getBlockingOngoingAction();
        if (blockingOngoingAction) {
            const messageHtml = /*html*/ `
                Can not start, due to ongoing action exclusive on the same lot:<br>
                <span class="text-highlight">${blockingOngoingAction.getActionText()}</span>
            `;
            NotificationService.createNotification(messageHtml, true);
            blockingOngoingAction.flashListItem();
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
                // Action fully transitioned => update queued actions
                actionService.updateQueuedActionsReadiness();
            }, ACTION_LIST_ITEM_TRANSITION_DURATION);
        }, ACTION_LIST_ITEM_TRANSITION_DURATION);
    }

    moveToTopOfQueue() {
        if (this.state !== ACTION_STATE.QUEUED) {
            console.log(`%c--- ERROR: action not queued => can NOT move to top of queue`, 'color: orange;');
            return;
        }
        document.querySelector('#actions-queued ul').prepend(this.elListItem);
        actionService.updateQueuedActionsReadiness();
        this.flashListItem();
    }

    /**
     * Used only for example actions, to force actions that are created as
     * ongoing and not ready, to NOT be marked as "startup-in-progress".
     */
    forceStartupFinished() {
        if (this.state === ACTION_STATE.ONGOING && !this.isReady) {
            // Move the started date in the past, such that the duration-startup is no longer in progress
            this.startedDate = new Date(this.startedDate.getTime() - this.durationStartup);
        }
    }

    /**
     * Return the new lot asset name, as a result of an ongoing / done action
     */
    getNewLotAssetData() {
        if (this.state === ACTION_STATE.QUEUED) {
            console.log(`%c--- ERROR: action queued => can NOT get new lot asset name`, 'color: orange;');
            return;
        }
        let newLotAssetData = {
            assetName: null,
            shouldUpdateAssetName: false,
        };
        switch (this.type) {
            case ACTION_TYPE.CONSTRUCT:
            case ACTION_TYPE.LAND:
                /**
                 * For these types of actions, a lot's asset is the action's
                 * subject, regardless if the action is ongoing or done:
                 * e.g. Construct "Warehouse", Land "Light Transport"
                 */
                newLotAssetData.assetName = this.subject;
                newLotAssetData.shouldUpdateAssetName = true;
                break;
            case ACTION_TYPE.DECONSTRUCT:
            case ACTION_TYPE.LAUNCH:
                /**
                 * For these types of actions, a lot's asset remains unchanged while
                 * the action is ongoing, but is reset after the action is done.
                 */
                if (this.state === ACTION_STATE.DONE) {
                    newLotAssetData.assetName = null;
                    newLotAssetData.shouldUpdateAssetName = true;
                }
                break;
            default:
                // Any other type of action does not affect a lot's asset name
                break;
        }
        return newLotAssetData;
    }

    /**
     * Return the new lot state, as a result of an ongoing / done action
     */
    getNewLotStateData() {
        if (this.state === ACTION_STATE.QUEUED) {
            console.log(`%c--- ERROR: action queued => can NOT get new lot state`, 'color: orange;');
            return;
        }
        let newLotStateData = {
            shouldUpdateState: false,
            state: null,
        };
        switch (this.type) {
            case ACTION_TYPE.TRANSFER:
            case ACTION_TYPE.TRAVEL:
            case ACTION_TYPE.CORE_SAMPLE:
            case ACTION_TYPE.EXTRACT:
            case ACTION_TYPE.REFINE:
                // These types of actions do not affect a lot's state
                break;
            case ACTION_TYPE.CONSTRUCT:
                if (this.state === ACTION_STATE.ONGOING) {
                    newLotStateData.state = LOT_STATE.BUILDING_UNDER_CONSTRUCTION;
                } else {
                    // Building constructed
                    newLotStateData.state = LOT_STATE.BUILDING_COMPLETED;
                }
                newLotStateData.shouldUpdateState = true;
                break;
            case ACTION_TYPE.DECONSTRUCT:
                if (this.state === ACTION_STATE.ONGOING) {
                    newLotStateData.state = LOT_STATE.BUILDING_UNDER_DECONSTRUCTION;
                } else {
                    // Building deconstructed => revert the lot's state to "EMPTY"
                    newLotStateData.state = LOT_STATE.EMPTY;
                }
                newLotStateData.shouldUpdateState = true;
                break;
            case ACTION_TYPE.LAND:
                if (this.state === ACTION_STATE.ONGOING) {
                    newLotStateData.state = LOT_STATE.SHIP_LANDING;
                } else {
                    // Ship landed
                    newLotStateData.state = LOT_STATE.SHIP_LANDED;
                }
                newLotStateData.shouldUpdateState = true;
                break;
            case ACTION_TYPE.LAUNCH:
                if (this.state === ACTION_STATE.ONGOING) {
                    newLotStateData.state = LOT_STATE.SHIP_LAUNCHING;
                } else {
                    // Ship launched => revert the lot's state to "EMPTY"
                    newLotStateData.state = LOT_STATE.EMPTY;
                }
                newLotStateData.shouldUpdateState = true;
                break;
        }
        return newLotStateData;
    }

    /**
     * Return the new lot action, as a result of an ongoing / done action
     */
    getNewLotActionData() {
        if (this.state === ACTION_STATE.QUEUED) {
            console.log(`%c--- ERROR: action queued => can NOT get new lot action`, 'color: orange;');
            return;
        }
        let newLotActionData = {
            actionText: null,
            shouldUpdateActionText: false,
        };
        if (this.isActionOnLot) {
            if (this.state === ACTION_STATE.ONGOING) {
                // Action ongoing => show an action text
                newLotActionData.actionText = `${ACTION_TYPE_DATA[this.type].TEXT_ING}: ${this.subject}`; // e.g. "Extracting: Water"
            } else {
                // Action done => reset the action text
                newLotActionData.actionText = null;
            }
            newLotActionData.shouldUpdateActionText = true;
        }
        return newLotActionData;
    }

    updateLotsList() {
        if (this.state === ACTION_STATE.QUEUED) {
            // Queued actions do not affect a lot's state or asset
            return;
        }
        const lotId = this.sourceId;
        const actionLot = crewService.getLotByIdForActiveCrewAndAsteroid(lotId);
        if (!actionLot) {
            console.log(`%c--- ERROR: lot not found for action #${this.id} => can NOT update lots list`, 'color: orange;');
            return;
        }
        const elLotsListItem = actionLot.elLotsListItem;
        const newLotAssetData = this.getNewLotAssetData();
        const newLotStateData = this.getNewLotStateData();
        const newLotActionData = this.getNewLotActionData();
        if (newLotAssetData && newLotAssetData.shouldUpdateAssetName) {
            // This lot property needs to be set BEFORE calling "getLotStateClass"
            actionLot.assetName = newLotAssetData.assetName;
            elLotsListItem.querySelector('.lot-asset').textContent = newLotAssetData.assetName || '';
        }
        if (newLotStateData && newLotStateData.shouldUpdateState) {
            if (newLotStateData.shouldUpdateState) {
                actionLot.state = newLotStateData.state;
            }
            const elLotState = elLotsListItem.querySelector('.lot-state');
            elLotState.dataset.stateClass = actionLot.getLotStateClass();
            elLotState.textContent = LOT_STATE_TEXT_SHORT[newLotStateData.state];
        }
        // Update cell for this specific action, from within ".lot-actions"
        const elLotActions = elLotsListItem.querySelector('.lot-actions');
        let elLotAction = elLotActions.querySelector(`.lot-action[data-action-id="${this.id}"]`);
        if (this.state === ACTION_STATE.DONE) {
            if (elLotAction) {
                deleteFromDOM(elLotAction);
            }
            return;
        }
        // Action ongoing
        if (!elLotAction) {
            // Inject cell for this specific action
            elLotAction = document.createElement('div');
            elLotAction.classList.add('lot-action');
            elLotAction.dataset.actionId = this.id;
            elLotActions.append(elLotAction);
        }
        if (newLotActionData && newLotActionData.shouldUpdateActionText) {
            elLotAction.innerHTML = /*html*/ `
                <span class="action-text">${newLotActionData.actionText}</span>
                <span class="progress-done"></span>
                <span class="timer-compact"></span>
            `;
            if (this.isReady) {
                elLotAction.classList.add('ready');
            }
        }
    }

    cleanupLotsForActionBeingDeleted() {
        if (this.state === ACTION_STATE.ONGOING && this.isActionOnLot && this.destinationId) {
            const destinationLot = crewService.getLotByIdForActiveCrewAndAsteroid(this.destinationId);
            if (destinationLot.isBeingAbandoned) {
                /**
                 * Ongoing action-on-lot being deleted, due to its DESTINATION lot being abandoned.
                 * Update the SOURCE lot, to no longer display this ongoing action.
                 * Also update the asset and/or state of the SOURCE lot, if needed.
                 */
                const actionLot = crewService.getLotByIdForActiveCrewAndAsteroid(this.sourceId);
                const elLotsListItem = actionLot.elLotsListItem;
                const elLotActions = elLotsListItem.querySelector('.lot-actions');
                const elLotAction = elLotActions.querySelector(`.lot-action[data-action-id="${this.id}"]`);
                deleteFromDOM(elLotAction);
                if (this.refreshOngoingInterval) {
                    this.clearRefreshOngoingInterval();
                }
                switch(this.type) {
                    case ACTION_TYPE.DECONSTRUCT:
                        // "Deconstruct" action being deleted => revert SOURCE lot state to "BUILDING_COMPLETED"
                        actionLot.state = LOT_STATE.BUILDING_COMPLETED;
                        const elLotState = elLotsListItem.querySelector('.lot-state');
                        elLotState.dataset.stateClass = actionLot.getLotStateClass();
                        elLotState.textContent = LOT_STATE_TEXT_SHORT[actionLot.state];
                        break;
                }
            }
        }
    }

    /**
     * Return the blocking ongoing action (if any) when attempting to
     * start a queued action which can not be transitioned to ongoing
     * (i.e. the same lot already has an ongoing action,
     * and BOTH actions are "on lot" AND "exclusive per lot").
     */
    getBlockingOngoingAction() {
        if (this.state !== ACTION_STATE.QUEUED || !this.isActionOnLot || !this.isActionExclusivePerLot) {
            return null;
        }
        // The queued action is "on lot" AND "exclusive per lot"
        const exclusiveOngoingActionOnSameLot = actionService.getExclusiveOngoingActionForActiveCrewAtLotId(this.sourceId);
        if (exclusiveOngoingActionOnSameLot) {
            // There is an ongoing action on the same lot, and it is also "exclusive per lot"
            return exclusiveOngoingActionOnSameLot;
        }
        return null;
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

    updateQueuedActionsReadiness() {
        document.querySelectorAll('#actions-queued ul li').forEach((elListItem, elListItemIndex) => {
            const action = this.getActionForListItem(elListItem);
            if (elListItemIndex === 0) {
                action.setReadyIfDifferent(true);
            } else {
                action.setReadyIfDifferent(false);
            }
        });
        //// TO DO: rework this method, to properly update the readiness of queued actions, based on e.g. [action-type vs. lot-availability]
    }

    /**
     * Based on: https://www.youtube.com/watch?v=jfYWwQrtzzY
     */
    updateQueuedDraggables() {
        const container = document.querySelector('#actions-queued ul');
        const draggables = container.querySelectorAll('li');
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => {
                container.classList.add('dragging-wrapper');
                draggable.classList.add('dragging', 'highlight');
            });
            draggable.addEventListener('dragend', () => {
                container.classList.remove('dragging-wrapper');
                draggable.classList.remove('dragging', 'highlight');
                const action = this.getActionForListItem(draggable);
                this.updateQueuedActionsReadiness();
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

    toggleAddAction() {
        const elAddActionButton = document.getElementById('add-action-button');
        const elActionSetupPanel = document.getElementById('action-setup-panel');
        if (elAddActionButton.classList.contains('active')) {
            elAddActionButton.classList.remove('active');
            elActionSetupPanel.classList.add('hidden');
        } else {
            closeConfigPanels();
            elAddActionButton.classList.add('active');
            elActionSetupPanel.classList.remove('hidden');
        }
    }

    getActionsForActiveCrewAtLotId(lotId, alsoMatchDestinationId = false) {
        const activeCrew = crewService.activeCrew;
        if (!activeCrew) {
            // Lots being initialized before the existence of an active crew
            return [];
        }
        return Object.values(actionService.actionsById).filter(action => {
            let isMatchingLotId = action.sourceId === lotId;
            if (alsoMatchDestinationId) {
                isMatchingLotId = isMatchingLotId || action.destinationId === lotId;
            }
            return action.crewId === activeCrew.id &&
                action.asteroidId === activeCrew.asteroidId &&
                action.isActionOnLot === true &&
                isMatchingLotId;
        });
    }

    getExclusiveOngoingActionForActiveCrewAtLotId(lotId) {
        const activeCrew = crewService.activeCrew;
        if (!activeCrew) {
            // Lots being initialized before the existence of an active crew
            return null;
        }
        return this.getActionsForActiveCrewAtLotId(lotId).find(action => {
            return action.isActionExclusivePerLot === true &&
                action.state === ACTION_STATE.ONGOING;
        });
    }
}

// Global variables and functions

globalThis.actionService = new ActionService();

globalThis.onMoveToTopOfQueue = function(actionId) {
    actionService.actionsById[actionId]?.moveToTopOfQueue();
}

globalThis.onRemoveActionById = function(actionId, shouldConfirm = false) {
    const action = actionService.actionsById[actionId];
    if (!action || action.state === ACTION_STATE.ONGOING) {
        // Ongoing actions can not be canceled, as of 2023-01-10
        return;
    }
    if (shouldConfirm && !confirm('Are you sure you want to remove this action?')) {
        return false;
    }
    action.removeAction();
};

globalThis.onTransitionActionById = function(actionId) {
    actionService.actionsById[actionId]?.transitionAction();
}

globalThis.onToggleAddAction = function() {
    actionService.toggleAddAction();
}

export {Action, ACTION_STATE, ACTION_TYPE};
