import {
    createElementFromHtml,
    deleteFromDOM,
    fromNow,
    getPseudoUniqueId,
    msToShortTime,
} from './abstract.js';
import {leaderLineConnectElements} from './leader-line-utils.js';
import {CREW_INVOLVEMENT} from './crew.js';
import {
    LOT_ASSET,
    LOT_STATE,
    LOT_STATE_DATA,
} from './lot.js';
import {NotificationService} from './notification.js';
import {Dropdown} from './dropdown.js';
import {
    BUILDING_NAMES,
    PRODUCT_NAMES,
    PRODUCT_NOT_BUILDING_NAMES,
    RESOURCE_NAMES,
    SHIP_NAMES,
    SHIP_NAMES_CAN_LAND_WITHOUT_SPACEPORT,
} from './product.js';

const ACTION_STATE = {
    DONE: 'DONE',
    ONGOING: 'ONGOING',
    QUEUED: 'QUEUED',
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

const REQUIREMENT = {
    ASSET_WITH_MATCHING_SHIP: 'ASSET_WITH_MATCHING_SHIP', // asset w/ matching ship = landed ship / Spaceport with docked ship
    ASSET_WITH_STORAGE: 'ASSET_WITH_STORAGE', // asset w/ storage = Warehouse / landed ship / Spaceport with docked ship
    ASTEROID: 'ASTEROID',
    BUILDING_EXTRACTOR: 'BUILDING_EXTRACTOR',
    BUILDING_MATCHING: 'BUILDING_MATCHING', // re: Deconstruct
    BUILDING_MATCHING_PLANNED_OR_EMPTY_LOT: 'BUILDING_MATCHING_PLANNED_OR_EMPTY_LOT', // re: Construct
    BUILDING_REFINERY: 'BUILDING_REFINERY',
    BUILDING_SPACEPORT_OR_EMPTY_LOT: 'BUILDING_SPACEPORT_OR_EMPTY_LOT', // re: Land
    CREW_FOR_FULL_DURATION: 'CREW_FOR_FULL_DURATION', // re: Core Sample
    CREW_IN_ORBIT: 'CREW_IN_ORBIT', // re: Land + Travel
    CREW_LANDED: 'CREW_LANDED', // re: Launch + all actions-on-lot
};

const REQUIREMENT_DATA = {
    ASSET_WITH_MATCHING_SHIP: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Matching Ship Landed / Docked at Spaceport',
    },
    ASSET_WITH_STORAGE: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Storage',
    },
    ASTEROID: {
        CREW_RELATED: false,
        LOT_RELATED: false,
        TEXT: 'Asteroid',
    },
    BUILDING_EXTRACTOR: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Extractor',
    },
    BUILDING_MATCHING: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Matching Building',
    },
    BUILDING_MATCHING_PLANNED_OR_EMPTY_LOT: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Matching Building Planned / Empty Lot',
    },
    BUILDING_REFINERY: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Refinery',
    },
    BUILDING_SPACEPORT_OR_EMPTY_LOT: {
        CREW_RELATED: false,
        LOT_RELATED: true,
        TEXT: 'Spaceport / Empty Lot',
    },
    CREW_FOR_FULL_DURATION: {
        CREW_RELATED: true,
        LOT_RELATED: false,
        TEXT: 'Crew Required for Duration',
    },
    CREW_IN_ORBIT: {
        CREW_RELATED: true,
        LOT_RELATED: false,
        TEXT: 'Crew in Orbit',
    },
    CREW_LANDED: {
        CREW_RELATED: true,
        LOT_RELATED: false,
        TEXT: 'Crew Landed',
    },
};

const ACTION_SUBJECT_TYPE = {
    BUILDING: 'BUILDING',
    RESOURCE: 'RESOURCE',
    PRODUCT: 'PRODUCT', // including resources
    PRODUCT_NOT_BUILDING: 'PRODUCT_NOT_BUILDING',
    SHIP: 'SHIP',
};

const ACTION_PREFIX_SOURCE_DEFAULT = 'Where';
const ACTION_PREFIX_SUBJECT_DEFAULT = 'What';

const ACTION_TYPE_DATA = {
    CONSTRUCT: {
        ICON_CLASS: 'icon-construct',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        PREFIX_SOURCE: ACTION_PREFIX_SOURCE_DEFAULT,
        PREFIX_SUBJECT: ACTION_PREFIX_SUBJECT_DEFAULT,
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_LANDED, REQUIREMENT.BUILDING_MATCHING_PLANNED_OR_EMPTY_LOT],
        REQUIRES_AT_DESTINATION: [],
        RUNTIME_DURATION: 45 * 1000,
        STARTUP_DURATION: 15 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.BUILDING,
        TEXT: 'Construct',
        TEXT_ING: 'Constructing',
    },
    CORE_SAMPLE: {
        ICON_CLASS: 'icon-core-sample',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: false,
        PREFIX_SOURCE: ACTION_PREFIX_SOURCE_DEFAULT,
        PREFIX_SUBJECT: ACTION_PREFIX_SUBJECT_DEFAULT,
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_LANDED, REQUIREMENT.CREW_FOR_FULL_DURATION],
        REQUIRES_AT_DESTINATION: [],
        RUNTIME_DURATION: 0,
        STARTUP_DURATION: 10 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.RESOURCE,
        TEXT: 'Core Sample',
        TEXT_ING: 'Core Sampling',
    },
    DECONSTRUCT: {
        ICON_CLASS: 'icon-deconstruct',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        PREFIX_SOURCE: ACTION_PREFIX_SOURCE_DEFAULT,
        PREFIX_SUBJECT: ACTION_PREFIX_SUBJECT_DEFAULT,
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_LANDED, REQUIREMENT.BUILDING_MATCHING],
        REQUIRES_AT_DESTINATION: [REQUIREMENT.ASSET_WITH_STORAGE],
        RUNTIME_DURATION: 45 * 1000,
        STARTUP_DURATION: 15 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.BUILDING,
        TEXT: 'Deconstruct',
        TEXT_ING: 'Deconstructing',
    },
    EXTRACT: {
        ICON_CLASS: 'icon-yield',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        PREFIX_SOURCE: ACTION_PREFIX_SOURCE_DEFAULT,
        PREFIX_SUBJECT: ACTION_PREFIX_SUBJECT_DEFAULT,
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_LANDED, REQUIREMENT.BUILDING_EXTRACTOR],
        REQUIRES_AT_DESTINATION: [REQUIREMENT.ASSET_WITH_STORAGE],
        RUNTIME_DURATION: 15 * 1000,
        STARTUP_DURATION: 5 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.RESOURCE,
        TEXT: 'Extract',
        TEXT_ING: 'Extracting',
    },
    LAND: {
        ICON_CLASS: 'icon-ship-down',
        IS_ACTION_ON_LOT: true, // WARNING: "Land" actions will use "sourceId" (NOT "destinationId") as the lot ID to land at
        IS_EXCLUSIVE_PER_LOT: true,
        PREFIX_SOURCE: ACTION_PREFIX_SOURCE_DEFAULT,
        PREFIX_SUBJECT: 'Ship',
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_IN_ORBIT, REQUIREMENT.CREW_FOR_FULL_DURATION, REQUIREMENT.BUILDING_SPACEPORT_OR_EMPTY_LOT],
        REQUIRES_AT_DESTINATION: [],
        RUNTIME_DURATION: 0,
        STARTUP_DURATION: 5 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.SHIP,
        TEXT: 'Land', // Land from orbit
        TEXT_ING: 'Landing', // Landing from orbit
    },
    LAUNCH: {
        ICON_CLASS: 'icon-ship-up',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        PREFIX_SOURCE: 'From',
        PREFIX_SUBJECT: 'Ship',
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_LANDED, REQUIREMENT.CREW_FOR_FULL_DURATION, REQUIREMENT.ASSET_WITH_MATCHING_SHIP],
        REQUIRES_AT_DESTINATION: [],
        RUNTIME_DURATION: 0,
        STARTUP_DURATION: 5 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.SHIP,
        TEXT: 'Launch', // Launch to orbit
        TEXT_ING: 'Launching', // Launching to orbit
    },
    REFINE: {
        ICON_CLASS: 'icon-ready',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: true,
        PREFIX_SOURCE: ACTION_PREFIX_SOURCE_DEFAULT,
        PREFIX_SUBJECT: ACTION_PREFIX_SUBJECT_DEFAULT,
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_LANDED, REQUIREMENT.BUILDING_REFINERY],
        REQUIRES_AT_DESTINATION: [REQUIREMENT.ASSET_WITH_STORAGE],
        RUNTIME_DURATION: 15 * 1000,
        STARTUP_DURATION: 5 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.RESOURCE,
        TEXT: 'Refine',
        TEXT_ING: 'Refining',
    },
    TRANSFER: {
        ICON_CLASS: 'icon-trade',
        IS_ACTION_ON_LOT: true,
        IS_EXCLUSIVE_PER_LOT: false,
        PREFIX_SOURCE: 'From',
        PREFIX_SUBJECT: ACTION_PREFIX_SUBJECT_DEFAULT,
        REQUIRES_AT_SOURCE: [REQUIREMENT.ASSET_WITH_STORAGE],
        REQUIRES_AT_DESTINATION: [REQUIREMENT.ASSET_WITH_STORAGE],
        RUNTIME_DURATION: 5 * 1000,
        STARTUP_DURATION: 0, // Crew presence not required for action "Transfer" => no cooldown
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.PRODUCT_NOT_BUILDING,
        TEXT: 'Transfer',
        TEXT_ING: 'Transfering',
    },
    TRAVEL: {
        ICON_CLASS: 'icon-ship-right',
        IS_ACTION_ON_LOT: false,
        IS_EXCLUSIVE_PER_LOT: false,
        PREFIX_SOURCE: 'From',
        PREFIX_SUBJECT: 'Ship',
        REQUIRES_AT_SOURCE: [REQUIREMENT.CREW_IN_ORBIT, REQUIREMENT.CREW_FOR_FULL_DURATION, REQUIREMENT.ASTEROID],
        REQUIRES_AT_DESTINATION: [REQUIREMENT.ASTEROID],
        RUNTIME_DURATION: 0,
        STARTUP_DURATION: 30 * 1000,
        SUBJECT_TYPE: ACTION_SUBJECT_TYPE.SHIP,
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
        source,
        sourceId,
        destination,
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
        this.subject = subject; // string (e.g. "Hydrogen" for "ACTION_TYPE.EXTRACT") or "LOT_ASSET" (e.g. for "ACTION_TYPE.CONSTRUCT")
        this.subjectName = lotService.getNameIfLotAsset(subject); // if "subject" is a "LOT_ASSET" value => convert it to lot-asset name
        this.source = source; // string (e.g. "LOT_ASSET['Extractor']" for "ACTION_TYPE.EXTRACT") or "Empty Lot" (e.g. for  "ACTION_TYPE.CONSTRUCT")
        this.sourceName = lotService.getNameIfLotAsset(source); // if "source" is a "LOT_ASSET" value => convert it to lot-asset name
        this.sourceId = sourceId; // number - e.g. lot ID, or asteroid ID for "ACTION_TYPE.TRAVEL"
        this.destination = destination; // string (e.g. "LOT_ASSET['Warehouse']" for "ACTION_TYPE.EXTRACT") or NULL (e.g. for "ACTION_TYPE.CORE_SAMPLE")
        this.destinationName = lotService.getNameIfLotAsset(destination); // if "destination" is a "LOT_ASSET" value => convert it to lot-asset name
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
        this.elTimelineItem = null;
        this.refreshOngoingInterval = null;
        this.refreshDoneInterval = null;
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
        const lotOrAsteroid = this.isActionOnLot ? 'Lot' : 'Asteroid';
        let actionText = `${ACTION_TYPE_DATA[this.type].TEXT}: ${this.subjectName}`;
        if (includeSource) {
            actionText += ` at ${lotOrAsteroid} ${this.sourceId.toLocaleString()} (${this.sourceName})`;
        }
        if (includeDestination && this.destinationId) {
            actionText += `, to ${lotOrAsteroid} ${this.destinationId.toLocaleString()} (${this.destinationName})`;
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
        if (!crewAction) {
            // Action must have been removed while the crew was still on cooldown from it
            return;
        }
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
        switch (this.type) {
            case ACTION_TYPE.LAND:
                crewService.activeCrew.setIsLanded(true, this.sourceId);
                break;
            case ACTION_TYPE.LAUNCH:
                crewService.activeCrew.setIsLanded(false);
                break;
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
            if (this.state === ACTION_STATE.ONGOING) {
                this.elListItem.classList.remove('startup-in-progress');
                /**
                 * Update list item HTML, in order to:
                 * - remove timer for ongoing action which has become ready
                 * - replace progress bars with "Finalize" button
                 */
                const elListItemTemp = createElementFromHtml(this.getListItemHtml());
                // Updating the HTML in this way is required, otherwise there may be issues e.g. with the transition to "Done"
                this.elListItem.innerHTML = elListItemTemp.innerHTML;
                this.injectLeaderLineIfNeeded();
                // Update timeline item HTML and ready-count
                this.elTimelineItem.classList.remove('startup-in-progress'); // needed for actions that require crew for full duration
                this.elTimelineItem.classList.add('ready');
                actionService.updateTimelineReadyCount(); // increment
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
            // Queued action transitioned to ongoing
            this.markStarted();
            actionService.updateQueuedActionsReadiness();
        }
        if (state === ACTION_STATE.DONE) {
            // Ongoing action transitioned to done
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

    clearRefreshDoneInterval() {
        if (this.refreshDoneInterval) {
            clearInterval(this.refreshDoneInterval);
        }
        this.refreshDoneInterval = null;
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
        const lotOrAsteroid = this.isActionOnLot ? 'Lot' : 'Asteroid';
        let destinationHtml = '';
        if (this.destinationName) {
            destinationHtml = /*html*/ `
                <div class="value value-destination">${lotOrAsteroid} ${this.destinationId.toLocaleString()} (${this.destinationName})</div>
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
                    <div class="subactions-cell subactions-cell-remove subactions-cell-hidden-if-ready-and-not-hover">
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
                        <div>Done <span class="timer-ago">${fromNow(this.finalizedDate)}</span></div>
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
                        ${this.subjectName}
                    </div>
                    ${timerCompactHtml}
                    <div class="lot-id">${this.isActionOnLot ? this.sourceId.toLocaleString() : ''}</div>
                </div>
                <div class="item-expand">
                    <div class="action-details">
                        <div class="value value-source">${lotOrAsteroid} ${this.sourceId.toLocaleString()} (${this.sourceName})</div>
                        ${destinationHtml}
                    </div>
                    <div class="subactions">
                        ${subactionsHtml}
                    </div>
                </div>
            </li>
        `;
    }

    /**
     * Source: ChatGPT... with a human touch.
     * Prompt: Write a JS function that takes values between 0 and 86400 as inputs,
     * and scales them exponentially between 0 and 100,
     * using a single log formula, without using if-else blocks.
     */
    getTimelineOffsetPercent() {
        let seconds;
        switch (this.state) {
            case ACTION_STATE.ONGOING:
                seconds = this.getOngoingTimeRemainingMs() / 1000;
                break;
            case ACTION_STATE.DONE:
                seconds = (Date.now() - this.finalizedDate) / 1000;
                break;
            default:
                // No timeline item for queued actions
                console.log(`%c--- ERROR: queued action => NO timeline item`, 'color: orange;');
                return;
        }
        if (seconds < 1) {
            // Avoid negative return-value, if time-diff less than 1 second
            return 0;
        }
        // Calculate the log base 10 of the input value
        const logValue = Math.log10(seconds);
        // Map the logValue to the range 0-1, representing the input's position on a linear scale
        // const mappedValue = logValue / 4.936513742478893; // log10(60*60*24) re: 100% = 1 day
        const mappedValue = logValue / 5.78161178249315; // log10(60*60*24*7) re: 100% = 1 week
        // Calculate the exponential scale based on the linearly mapped value
        return 100 * (Math.exp(mappedValue) - 1) / (Math.exp(1) - 1);
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
        // Update list-item timer
        const elTimerCompact = this.elListItem.querySelector('.timer-compact');
        elTimerCompact.textContent = timeRemainingShort;
        // Update timeline-item timer
        const elTimelineTimer = this.elTimelineItem.querySelector('.timer');
        elTimelineTimer.textContent = timeRemainingShort;
        this.elTimelineItem.style.setProperty('--offset-x', `${this.getTimelineOffsetPercent()}%`);
        // Update progress percent and progress bars
        const progress = Math.round(100 * (ongoingTimeElapsedMs) / this.durationTotal);
        this.elListItem.querySelector('.progress-done').textContent = progress;
        this.elListItem.querySelector('.progress-bars').style.setProperty('--progress-done', `${progress}%`);
        // Mark the list item if non-zero startup duration in progress (i.e. crew on cooldown because of it)
        let isStartupInProgress = false;
        if (this.durationStartup && ongoingTimeElapsedMs < this.durationStartup) {
            this.elListItem.classList.add('startup-in-progress');
            this.elTimelineItem.classList.add('startup-in-progress');
            isStartupInProgress = true;
        } else {
            this.elListItem.classList.remove('startup-in-progress');
            this.elTimelineItem.classList.remove('startup-in-progress');
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

    refreshDoneTime() {
        if (this.state !== ACTION_STATE.DONE) {
            console.log(`%c--- ERROR: action not done => can NOT refresh time`, 'color: orange;');
            this.clearRefreshDoneInterval();
            return;
        }
        // Update list-item timer
        const timeAgo = fromNow(this.finalizedDate);
        const elTimerAgo = this.elListItem.querySelector('.timer-ago');
        elTimerAgo.textContent = timeAgo;
        // Update timeline-item timer
        const elTimelineTimer = this.elTimelineItem.querySelector('.timer');
        elTimelineTimer.textContent = msToShortTime(Date.now() - this.finalizedDate);
        this.elTimelineItem.style.setProperty('--offset-x', `${this.getTimelineOffsetPercent()}%`);
    }

    injectListAndTimelineItem() {
        this.injectListItem();
        this.injectTimelineItem();
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
        this.elListItem = createElementFromHtml(this.getListItemHtml());
        // Highlight timeline item, on hover over list item
        this.elListItem.addEventListener('mouseenter', () => {
            if (this.elTimelineItem) {
                this.elTimelineItem.classList.add('highlight');
            }
        });
        this.elListItem.addEventListener('mouseleave', () => {
            if (this.elTimelineItem) {
                this.elTimelineItem.classList.remove('highlight');
            }
        });
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
        if (this.state === ACTION_STATE.DONE) {
            this.refreshDoneInterval = setInterval(() => this.refreshDoneTime(), 1000); // refresh every 1 second
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

    injectTimelineItem() {
        let elTimeline;
        let timeDiffShort;
        let readyClass = '';
        switch (this.state) {
            case ACTION_STATE.ONGOING:
                elTimeline = document.getElementById('timeline-ongoing');
                timeDiffShort = msToShortTime(this.getOngoingTimeRemainingMs());
                if (this.isReady) {
                    // Required for pre-populated actions which are initialized as "ready ongoing"
                    readyClass = 'ready';
                    actionService.updateTimelineReadyCount(); // increment
                }
                break;
            case ACTION_STATE.DONE:
                elTimeline = document.getElementById('timeline-done');
                timeDiffShort = msToShortTime(Date.now() - this.finalizedDate);
                break;
            default:
                // No timeline item for queued actions
                return;
        }
        const timelineItemHtml = /*html*/ `
            <div id="timeline_action_${this.id}"
                    class="timeline-action icon-round ${ACTION_TYPE_DATA[this.type].ICON_CLASS} ${readyClass}"
                    style="--offset-x: ${this.getTimelineOffsetPercent()}%;">
                <span class="timer">${timeDiffShort}</span>
            </div>
        `;
        if (this.elTimelineItem) {
            // Move existing timeline item, from "ongoing" to "done"
            this.elTimelineItem.classList.remove('ready');
        } else {
            // Inject new timeline item, into "ongoing"
            this.elTimelineItem = createElementFromHtml(timelineItemHtml);
            this.elTimelineItem.dataset.tooltipText = this.getActionText();
            // Highlight both timeline item and list item, on hover over timeline item
            this.elTimelineItem.addEventListener('mouseenter', () => {
                this.elTimelineItem.classList.add('highlight');
                this.elListItem.classList.add('highlight');
            });
            this.elTimelineItem.addEventListener('mouseleave', () => {
                this.elTimelineItem.classList.remove('highlight');
                this.elListItem.classList.remove('highlight');
            });
        }
        elTimeline.append(this.elTimelineItem);
    }

    setCrewCooldownBeforeTransition(transitionDuration) {
        let cooldown = 0;
        switch (this.state) {
            case ACTION_STATE.QUEUED:
                // Action transitioning from queued to ongoing => default cooldown = startup duration
                cooldown = this.durationStartup;
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
        if (this.refreshDoneInterval) {
            this.clearRefreshDoneInterval();
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
                if (this.elTimelineItem) {
                    deleteFromDOM(this.elTimelineItem); // also remove timeline item, if it exists (i.e. this was NOT a queued action)
                }
                this.clearRefreshOngoingInterval();
                this.clearRefreshDoneInterval();
                // Remove global reference
                delete actionService.actionsById[this.id];
                actionService.updateTimelineReadyCount(); // decrement
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
                if (nextState === ACTION_STATE.DONE) {
                    actionService.updateTimelineReadyCount(); // decrement
                }
                this.injectListAndTimelineItem();
                this.flashListItem();
            }, ACTION_LIST_ITEM_TRANSITION_DURATION);
        }, ACTION_LIST_ITEM_TRANSITION_DURATION);
    }

    moveToTopOfQueue(updateReadinessAndFlash = true) {
        if (this.state !== ACTION_STATE.QUEUED) {
            console.log(`%c--- ERROR: action not queued => can NOT move to top of queue`, 'color: orange;');
            return;
        }
        document.querySelector('#actions-queued ul').prepend(this.elListItem);
        if (updateReadinessAndFlash) {
            actionService.updateQueuedActionsReadiness();
            this.flashListItem();
        }
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
    getNewLotAssetData(lot) {
        if (this.state === ACTION_STATE.QUEUED) {
            console.log(`%c--- ERROR: action queued => can NOT get new lot asset name`, 'color: orange;');
            return;
        }
        let newLotAssetData = {
            asset: null,
            shouldUpdateAsset: false,
        };
        switch (this.type) {
            case ACTION_TYPE.CONSTRUCT:
                /**
                 * Building constructing / constructed => change the lot's asset to the action's subject
                 * (value of type "LOT_ASSET"), regardless if the action is ongoing or done.
                 */
                newLotAssetData.asset = this.subject; // NOT "this.subjectName"
                newLotAssetData.shouldUpdateAsset = true;
                break;
            case ACTION_TYPE.LAND:
                /**
                 * Ship landing / landed => change the lot's asset to the action's subject
                 * (value of type "LOT_ASSET"), regardless if the action is ongoing or done.
                 * Do this only if the lot did not have a building-related state.
                 * Otherwise it means the ship is landing / landed at a Spaceport.
                 */
                if (!LOT_STATE_DATA[lot.state].IS_BUILDING_STATE) {
                    newLotAssetData.asset = this.subject; // NOT "this.subjectName"
                    newLotAssetData.shouldUpdateAsset = true;
                }
                break;
            case ACTION_TYPE.DECONSTRUCT:
                /**
                 * Building deconstructing / deconstructed => do NOT change the lot's asset
                 * while the action is ongoing, but reset it after the action is done.
                 */
                if (this.state === ACTION_STATE.DONE) {
                    newLotAssetData.asset = null;
                    newLotAssetData.shouldUpdateAsset = true;
                }
                break;
            case ACTION_TYPE.LAUNCH:
                /**
                 * Ship launching / launched => do NOT change the lot's asset
                 * while the action is ongoing, but reset it after the action is done.
                 * Do this only if the lot did not have a building-related state.
                 * Otherwise it means the ship is launching / launched from a Spaceport.
                 */
                if (this.state === ACTION_STATE.DONE && !LOT_STATE_DATA[lot.state].IS_BUILDING_STATE) {
                    newLotAssetData.asset = null;
                    newLotAssetData.shouldUpdateAsset = true;
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
    getNewLotStateData(lot) {
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
                /**
                 * Ship landing / landed => change the lot state.
                 * Do this only if the lot did not have a building-related state.
                 * Otherwise it means the ship is landing / landed at a Spaceport.
                 */
                if (!LOT_STATE_DATA[lot.state].IS_BUILDING_STATE) {
                    if (this.state === ACTION_STATE.ONGOING) {
                        newLotStateData.state = LOT_STATE.SHIP_LANDING;
                    } else {
                        newLotStateData.state = LOT_STATE.SHIP_LANDED;
                    }
                    newLotStateData.shouldUpdateState = true;
                }
                break;
            case ACTION_TYPE.LAUNCH:
                /**
                 * Ship launching / launched => change the lot state.
                 * Do this only if the lot did not have a building-related state.
                 * Otherwise it means the ship is launching / launched from a Spaceport.
                 */
                if (!LOT_STATE_DATA[lot.state].IS_BUILDING_STATE) {
                    if (this.state === ACTION_STATE.ONGOING) {
                        newLotStateData.state = LOT_STATE.SHIP_LAUNCHING;
                    } else {
                        newLotStateData.state = LOT_STATE.EMPTY;
                    }
                    newLotStateData.shouldUpdateState = true;
                }
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
                newLotActionData.actionText = `${ACTION_TYPE_DATA[this.type].TEXT_ING}: ${this.subjectName}`; // e.g. "Extracting: Water"
            } else {
                // Action done => reset the action text
                newLotActionData.actionText = null;
            }
            newLotActionData.shouldUpdateActionText = true;
        }
        return newLotActionData;
    }

    updateLotsList() {
        if (!this.isActionOnLot) {
            // Action not on lot => nothing to update
            return;
        }
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
        const newLotAssetData = this.getNewLotAssetData(actionLot);
        const newLotStateData = this.getNewLotStateData(actionLot);
        const newLotActionData = this.getNewLotActionData();
        if (newLotAssetData && newLotAssetData.shouldUpdateAsset) {
            // This lot property needs to be set BEFORE calling "getLotStateClass"
            actionLot.setAsset(newLotAssetData.asset);
            elLotsListItem.querySelector('.lot-asset').textContent = actionLot.assetName;
        }
        if (newLotStateData && newLotStateData.shouldUpdateState) {
            if (newLotStateData.shouldUpdateState) {
                actionLot.state = newLotStateData.state;
            }
            const elLotState = elLotsListItem.querySelector('.lot-state');
            elLotState.dataset.stateClass = actionLot.getLotStateClass();
            elLotState.textContent = LOT_STATE_DATA[newLotStateData.state].TEXT;
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
                if (this.refreshDoneInterval) {
                    this.clearRefreshDoneInterval();
                }
                switch(this.type) {
                    case ACTION_TYPE.DECONSTRUCT:
                        // "Deconstruct" action being deleted => revert SOURCE lot state to "BUILDING_COMPLETED"
                        actionLot.state = LOT_STATE.BUILDING_COMPLETED;
                        const elLotState = elLotsListItem.querySelector('.lot-state');
                        elLotState.dataset.stateClass = actionLot.getLotStateClass();
                        elLotState.textContent = LOT_STATE_DATA[actionLot.state].TEXT;
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
        this.queuedActionsContainer = document.querySelector('#actions-queued ul');
        this.elTimelineReadyCount = document.getElementById('timeline-ready');
        this.elAddActionRequiresSource = document.getElementById('add-action-requires-source');
        this.elAddActionRequiresDestination = document.getElementById('add-action-requires-destination');
        // Action type
        this.elAddActionTypeDropdown = document.getElementById('add-action-type-dropdown');
        this.addActionTypeDropdown = null;
        this.addActionTypePreviousValue = null;
        // Action subject
        this.elAddActionSubjectDropdown = document.getElementById('add-action-subject-dropdown');
        this.addActionSubjectDropdown = null;
        // Action source-lot
        this.elAddActionLotDropdown = document.getElementById('add-action-lot-dropdown');
        this.addActionLotDropdown = null;
        // Action destination-lot
        this.elAddActionDestinationLotDropdown = document.getElementById('add-action-destination-lot-dropdown');
        this.addActionDestinationLotDropdown = null;
        this.elAddActionDestinationLotError = document.getElementById('add-action-destination-lot-error');
        // Action destination-asteroid
        this.elAddActionDestinationAsteroidDropdown = document.getElementById('add-action-destination-asteroid-dropdown');
        this.addActionDestinationAsteroidDropdown = null;
    }

    getActionForListItem(elListItem) {
        const actionId = elListItem.id.replace('action_', '');
        return this.actionsById[actionId];
    }

    updateQueuedActionsReadiness() {
        this.queuedActionsContainer.querySelectorAll('li').forEach((elListItem, elListItemIndex) => {
            const action = this.getActionForListItem(elListItem);
            if (elListItemIndex === 0) {
                action.setReadyIfDifferent(true);
            } else {
                action.setReadyIfDifferent(false);
            }
        });
        //// TO DO: rework this method, to properly update the readiness of queued actions, based on e.g. [action-type vs. lot-availability]
    }

    addEventListenersForDraggable(draggable) {
        if (draggable.dataset.handlesDragEvents) {
            console.log(`%c--- ERROR: #${draggable.id} already listening for drag events`, 'color: orange;');
            return;
        }
        const container = this.queuedActionsContainer;
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
        draggable.dataset.handlesDragEvents = true;
    }

    /**
     * Based on: https://www.youtube.com/watch?v=jfYWwQrtzzY
     */
    updateInitiallyQueuedDraggables() {
        const container = this.queuedActionsContainer;
        if (container.dataset.handlesDragover) {
            console.log(`%c--- ERROR: queued-actions container already listening for dragover`, 'color: orange;');
            return;
        }
        container.querySelectorAll('li').forEach(draggable => this.addEventListenersForDraggable(draggable));
        container.addEventListener('dragover', event => {
            // Prevent default to allow drop (does not seem to be required in Firefox, but keeping it, just to be safe)
            event.preventDefault();
            const listItemDragging = container.querySelector('.dragging');
            const listItemNext = this.getListItemAfterTheOneBeingDragged(event.clientY);
            if (listItemNext === null) {
                // List item being dragged is below all draggables
                container.appendChild(listItemDragging);
            } else {
                container.insertBefore(listItemDragging, listItemNext);
            }
        });
        container.dataset.handlesDragover = true;
    }

    getListItemAfterTheOneBeingDragged(y) {
        const elsDraggable = [...this.queuedActionsContainer.querySelectorAll('[draggable]:not(.dragging)')];
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
        const elAddActionPanel = document.getElementById('add-action-panel');
        if (elAddActionButton.classList.contains('active')) {
            elAddActionButton.classList.remove('active');
            elAddActionPanel.classList.add('hidden');
        } else {
            closeConfigPanels();
            elAddActionButton.classList.add('active');
            elAddActionPanel.classList.remove('hidden');
            this.addActionTypeDropdown.updateOptionsMaxWidth();
            this.updateAddActionDetails();
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

    initializeAddActionTypeDropdown() {
        this.addActionTypeDropdown = new Dropdown(
            this.elAddActionTypeDropdown,
            this.onSelectAddActionTypeOption.bind(this),
        );
        const optionsData = Object.keys(ACTION_TYPE).map(actionType => {
            return {
                iconClass: ACTION_TYPE_DATA[actionType].ICON_CLASS,
                text: ACTION_TYPE_DATA[actionType].TEXT,
                value: actionType,
            };
        });
        this.addActionTypeDropdown.setOptions(optionsData);
    }

    initializeAddActionSubjectDropdown() {
        this.addActionSubjectDropdown = new Dropdown(
            this.elAddActionSubjectDropdown,
            this.onSelectAddActionSubjectOption.bind(this),
            10,
            true,
        );
    }

    initializeAddActionLotDropdowns() {
        this.addActionLotDropdown = new Dropdown(
            this.elAddActionLotDropdown,
            this.onSelectAddActionLotOption.bind(this),
            10,
            true,
            'Search by ID, asset or state',
        );
        this.addActionDestinationLotDropdown = new Dropdown(
            this.elAddActionDestinationLotDropdown,
            this.onSelectAddActionDestinationLotOption.bind(this),
            10,
            true,
            'Search by ID, asset or state',
        );
    }

    initializeAddActionDestinationAsteroidDropdowns() {
        //// TO DO: initialize "addActionDestinationAsteroidDropdown"
    }

    getAddActionSubjectOptionsData() {
        let optionsData = [];
        let optionNames;
        const actionType = this.addActionTypeDropdown.getSelectedValue();
        switch (ACTION_TYPE_DATA[actionType].SUBJECT_TYPE) {
            case ACTION_SUBJECT_TYPE.BUILDING:
                optionNames = BUILDING_NAMES;
                break;
            case ACTION_SUBJECT_TYPE.PRODUCT:
                optionNames = PRODUCT_NAMES;
                break;
            case ACTION_SUBJECT_TYPE.PRODUCT_NOT_BUILDING:
                optionNames = PRODUCT_NOT_BUILDING_NAMES;
                break;
            case ACTION_SUBJECT_TYPE.RESOURCE:
                optionNames = RESOURCE_NAMES;
                break;
            case ACTION_SUBJECT_TYPE.SHIP:
                optionNames = SHIP_NAMES;
                break;
        }
        optionsData = optionNames.map(optionName => {
            return {
                value: optionName,
            };
        });
        return optionsData;
    }

    getAddActionLotOptionsData() {
        const optionsData = [];
        const lots = crewService.getLotsForActiveCrewAndAsteroid() || [];
        for (const lot of lots) {
            let lotAssetText = '';
            if (lot.assetName) {
                lotAssetText = ` (${lot.assetName})`;
            }
            optionsData.push({
                text: `${lot.id.toLocaleString()}${lotAssetText}`,
                textSecondary: LOT_STATE_DATA[lot.state].TEXT,
                value: lot.id,
            });
        }
        return optionsData;
    }

    /**
     * Update details in add-action panel, based on the currently selected action-type:
     * - subject
     * - source-lot + destination-lot dropdowns (if visible)
     * - destination-asteroid dropdown (if visible)
     */
    updateAddActionDetails(isChangedSubjectType = true) {
        this.updateAddActionSubject(isChangedSubjectType);
        this.updateAddActionSourceAndDestination(isChangedSubjectType);
        this.updateCrewRequirementsStatus();
    }

    updateAddActionSubject(resetSubjectOptions = true) {
        const actionType = this.addActionTypeDropdown.getSelectedValue();
        // Update subject prefix
        document.getElementById('add-action-prefix-subject').textContent = `${ACTION_TYPE_DATA[actionType].PREFIX_SUBJECT}:`;
        if (resetSubjectOptions) {
            const optionsData = this.getAddActionSubjectOptionsData();
            this.addActionSubjectDropdown.setOptions(optionsData);
        }
        this.addActionSubjectDropdown.updateOptionsMaxWidth();
    }

    updateAddActionSourceAndDestination(resetLotOptions = true) {
        const actionType = this.addActionTypeDropdown.getSelectedValue();
        const isActionAtLot = ACTION_TYPE_DATA[actionType].IS_ACTION_ON_LOT;
        const requiresAtDestination = ACTION_TYPE_DATA[actionType].REQUIRES_AT_DESTINATION;
        // Update source prefix
        document.getElementById('add-action-prefix-source').textContent = `${ACTION_TYPE_DATA[actionType].PREFIX_SOURCE}:`;
        /**
         * Show all source+destination dropdowns by default.
         * NOT hiding them by default, to avoid dropdown-width flicker, as much as possible.
         */
        this.elAddActionLotDropdown.parentElement.classList.remove('hidden');
        this.elAddActionDestinationLotDropdown.parentElement.classList.remove('hidden');
        this.elAddActionDestinationAsteroidDropdown.parentElement.classList.remove('hidden');
        const elDestinationRow = document.getElementById('add-action-destination-row');
        if (requiresAtDestination.length) {
            // Show destination label
            elDestinationRow.classList.remove('hidden');
            if (isActionAtLot) {
                // Hide destination asteroid
                this.elAddActionDestinationAsteroidDropdown.parentElement.classList.add('hidden');
            } else {
                // Hide destination lot and error
                this.elAddActionDestinationLotDropdown.parentElement.classList.add('hidden');
                this.elAddActionDestinationLotError.classList.add('hidden');
            }
        } else {
            // Hide destination label + lot + asteroid
            elDestinationRow.classList.add('hidden');
            this.elAddActionDestinationLotDropdown.parentElement.classList.add('hidden');
            this.elAddActionDestinationAsteroidDropdown.parentElement.classList.add('hidden');
        }
        if (isActionAtLot) {
            // Action on lot
            if (resetLotOptions) {
                const addActionLotOptionsData = this.getAddActionLotOptionsData();
                this.addActionLotDropdown.setOptions(addActionLotOptionsData);
                this.addActionDestinationLotDropdown.setOptions(addActionLotOptionsData);
            }
            if (this.addActionLotDropdown.noOption) {
                // No lot initialized (yet) => bypass lot-related logic
                return;
            }
            this.addActionLotDropdown.updateOptionsMaxWidth();
            this.addActionDestinationLotDropdown.updateOptionsMaxWidth();
            // Handle pre-selected / previously-selected lot IDs (pre-selected if "resetLotOptions" TRUE)
            this.onSelectAddActionLotOption(this.addActionLotDropdown.getSelectedValue());
            this.onSelectAddActionDestinationLotOption(this.addActionDestinationLotDropdown.getSelectedValue());
        } else {
            // Hide source lot (destination lot already hidden, at this point)
            this.elAddActionLotDropdown.parentElement.classList.add('hidden');
        }
    }

    updateCrewRequirementsStatus() {
        for (const elRequirement of this.elAddActionRequiresSource.querySelectorAll('.add-action-requirement')) {
            const requirement = elRequirement.dataset.value;
            // Parse only lot-related requirements
            if (!REQUIREMENT_DATA[requirement].CREW_RELATED) {
                continue;
            }
            // Crew-related requirement
            let isValid = false;
            switch (requirement) {
                case REQUIREMENT.CREW_FOR_FULL_DURATION:
                    // Just a tip, NOT an actual requirement
                    isValid = null;
                    break;
                case REQUIREMENT.CREW_IN_ORBIT:
                    // FALSE before the "activeCrew" is initialized
                    isValid = Boolean(crewService.activeCrew && !crewService.activeCrew.isLanded);
                    break;
                    case REQUIREMENT.CREW_LANDED:
                    // FALSE before the "activeCrew" is initialized
                    isValid = Boolean(crewService.activeCrew && crewService.activeCrew.isLanded);
                    break;
            }
            if (isValid === null) {
                // Do not change the status of non-requirement tips
                continue;
            }
            if (isValid) {
                elRequirement.classList.add('text-ready');
                elRequirement.classList.remove('text-warning');
            } else {
                elRequirement.classList.remove('text-ready');
                elRequirement.classList.add('text-warning');
            }
        }
    }

    toggleHighlightAddActionLotDropdown(highlight, isDestinationLot) {
        const lotDropdown = isDestinationLot ? this.addActionDestinationLotDropdown : this.addActionLotDropdown;
        if (highlight) {
            lotDropdown.elList.classList.add('highlight');
        } else {
            lotDropdown.elList.classList.remove('highlight');
        }
    }

    toggleWarningActiveCrewBase(warn) {
        const elActiveBase = document.getElementById('active-base');
        if (warn) {
            elActiveBase.classList.add('warning');
        } else {
            elActiveBase.classList.remove('warning');
        }
    }

    onSelectAddActionTypeOption(actionType) {
        // Update requires at source
        this.elAddActionRequiresSource.textContent = '';
        for (const requirement of ACTION_TYPE_DATA[actionType].REQUIRES_AT_SOURCE) {
            const elRequirementHtml = /*html*/ `
                <span class="add-action-requirement" data-value="${requirement}">${REQUIREMENT_DATA[requirement].TEXT}</span>
            `;
            const elRequirement = createElementFromHtml(elRequirementHtml);
            if (REQUIREMENT_DATA[requirement].LOT_RELATED) {
                elRequirement.addEventListener('mouseenter', () => this.toggleHighlightAddActionLotDropdown(true, false));
                elRequirement.addEventListener('mouseleave', () => this.toggleHighlightAddActionLotDropdown(false, false));
            }
            if (REQUIREMENT_DATA[requirement].CREW_RELATED) {
                elRequirement.addEventListener('mouseenter', () => this.toggleWarningActiveCrewBase(elRequirement.classList.contains('text-warning')));
                elRequirement.addEventListener('mouseleave', () => this.toggleWarningActiveCrewBase(false));
            }
            this.elAddActionRequiresSource.append(elRequirement);
        }
        // Update requires at destination
        const elsRequiresDestination = document.querySelectorAll('.requires-destination');
        const requiresAtDestination = ACTION_TYPE_DATA[actionType].REQUIRES_AT_DESTINATION;
        this.elAddActionRequiresDestination.textContent = '';
        if (requiresAtDestination.length) {
            elsRequiresDestination.forEach(el => el.classList.remove('hidden'));
            for (const requirement of requiresAtDestination) {
                const elRequirementHtml = /*html*/ `
                    <span class="add-action-requirement" data-value="${requirement}">${REQUIREMENT_DATA[requirement].TEXT}</span>
                `;
                const elRequirement = createElementFromHtml(elRequirementHtml);
                if (REQUIREMENT_DATA[requirement].LOT_RELATED) {
                    elRequirement.addEventListener('mouseenter', () => this.toggleHighlightAddActionLotDropdown(true, true));
                    elRequirement.addEventListener('mouseleave', () => this.toggleHighlightAddActionLotDropdown(false, true));
                }
                this.elAddActionRequiresDestination.append(elRequirement);
            }
        } else {
            // Hide requires at destination
            elsRequiresDestination.forEach(el => el.classList.add('hidden'));
        }
        // Update other details
        const isChangedSubjectType = ACTION_TYPE_DATA[actionType].SUBJECT_TYPE !== ACTION_TYPE_DATA[this.addActionTypePreviousValue]?.SUBJECT_TYPE;
        this.updateAddActionDetails(isChangedSubjectType);
        this.addActionTypePreviousValue = actionType;
    }

    onSelectAddActionSubjectOption() {
        this.updateAddActionSourceAndDestination(false);
    }

    onSelectAddActionLotOption(lotId, isDestinationLot = false) {
        if (!lotId) {
            // Add-action-lot dropdown not yet initialized
            return;
        }
        let lot = null;
        if (lotId) {
            lotId = Number(lotId);
            lot = crewService.getLotByIdForActiveCrewAndAsteroid(lotId);
        }
        const lotDropdown = isDestinationLot ? this.addActionDestinationLotDropdown : this.addActionLotDropdown;
        // Clear warning from lot-dropdown (if any)
        lotDropdown.setDropdownWarning(false);
        const isEmptyLot = !lot.asset;
        // If action-subject is a building, and lot-asset also a building => check if matching building
        let isBuildingMatching = false;
        let isShipMatching = false;
        let isShipCanLandWithoutSpaceport = false;
        const actionType = this.addActionTypeDropdown.getSelectedValue();
        const actionSubject = this.addActionSubjectDropdown.getSelectedValue();
        if (ACTION_TYPE_DATA[actionType].SUBJECT_TYPE === ACTION_SUBJECT_TYPE.BUILDING) {
            // Action-subject is a building
            isBuildingMatching = actionSubject === lot.asset;
        }
        if (ACTION_TYPE_DATA[actionType].SUBJECT_TYPE === ACTION_SUBJECT_TYPE.SHIP) {
            // Action-subject is a ship
            isShipMatching = actionSubject === lot.asset;
            isShipCanLandWithoutSpaceport = SHIP_NAMES_CAN_LAND_WITHOUT_SPACEPORT.includes(actionSubject);
        }
        // Validate each source / destination requirement
        const elRequirementsContainer = isDestinationLot ? this.elAddActionRequiresDestination : this.elAddActionRequiresSource;
        for (const elRequirement of elRequirementsContainer.querySelectorAll('.add-action-requirement')) {
            const requirement = elRequirement.dataset.value;
            // Parse only lot-related requirements
            if (!REQUIREMENT_DATA[requirement].LOT_RELATED) {
                continue;
            }
            let isValid = false;
            // Clear source-lot-related status for this requirement
            this.setAddActionLotRequirementStatus(elRequirement, false, false, isDestinationLot);
            switch (requirement) {
                case REQUIREMENT.ASSET_WITH_MATCHING_SHIP:
                    // Matching landed ship / Spaceport with (assumed matching) docked ship
                    const isShipMatchingLanded = isShipMatching && SHIP_NAMES_CAN_LAND_WITHOUT_SPACEPORT.includes(lot.asset);
                    if (lot.asset === LOT_ASSET['Spaceport'] || isShipMatchingLanded) {
                        isValid = true;
                    }
                    break;
                case REQUIREMENT.ASSET_WITH_STORAGE:
                    // Warehouse / landed ship / Spaceport with (assumed) docked ship
                    if ([LOT_ASSET['Warehouse'], LOT_ASSET['Light Transport'], LOT_ASSET['Spaceport']].includes(lot.asset)) {
                        isValid = true;
                    }
                    break;
                case REQUIREMENT.BUILDING_EXTRACTOR:
                    if (lot.asset === LOT_ASSET['Extractor']) {
                        isValid = true;
                    }
                    break;
                case REQUIREMENT.BUILDING_MATCHING:
                    if (isBuildingMatching) {
                        isValid = true;
                    }
                    break;
                case REQUIREMENT.BUILDING_MATCHING_PLANNED_OR_EMPTY_LOT:
                    const isBuildingMatchingPlanned = isBuildingMatching && lot.state === LOT_STATE.BUILDING_SITE_PLAN;
                    if (isBuildingMatchingPlanned || isEmptyLot) {
                        isValid = true;
                    }
                    break;
                case REQUIREMENT.BUILDING_REFINERY:
                    if (lot.asset === LOT_ASSET['Refinery']) {
                        isValid = true;
                    }
                    break;
                case REQUIREMENT.BUILDING_SPACEPORT_OR_EMPTY_LOT:
                    if (lot.asset === LOT_ASSET['Spaceport'] || (isEmptyLot && isShipCanLandWithoutSpaceport)) {
                        isValid = true;
                    }
                    break;
                //// ...
            }
            if (isValid) {
                this.setAddActionLotRequirementStatus(elRequirement, true, false, isDestinationLot);
            } else {
                this.setAddActionLotRequirementStatus(elRequirement, false, true, isDestinationLot);
            }
        }
        // Ensure source and destination lots are different
        const requiresAtDestination = ACTION_TYPE_DATA[actionType].REQUIRES_AT_DESTINATION;
        if (requiresAtDestination.length && this.addActionLotDropdown.getSelectedValue() === this.addActionDestinationLotDropdown.getSelectedValue()) {
            lotDropdown.setDropdownWarning(true);
            this.elAddActionDestinationLotError.classList.remove('hidden');
        } else {
            this.elAddActionDestinationLotError.classList.add('hidden');
        }
    }

    onSelectAddActionDestinationLotOption(lotId) {
        this.onSelectAddActionLotOption(lotId, true);
    }

    setAddActionLotRequirementStatus(elRequirement, isReady, isWarning, isDestinationLot = false) {
        if (isReady) {
            elRequirement.classList.add('text-ready');
        } else {
            elRequirement.classList.remove('text-ready');
        }
        const lotDropdown = isDestinationLot ? this.addActionDestinationLotDropdown : this.addActionLotDropdown;
        if (isWarning) {
            elRequirement.classList.add('text-warning');
            lotDropdown.setDropdownWarning(true);
        } else {
            elRequirement.classList.remove('text-warning');
            lotDropdown.setDropdownWarning(false);
        }
    }

    submitAddActionForm() {
        const actionType = this.addActionTypeDropdown.getSelectedValue();
        const actionTypeData = ACTION_TYPE_DATA[actionType];
        const isActionAtLot = actionTypeData.IS_ACTION_ON_LOT;
        const requiresAtDestination = actionTypeData.REQUIRES_AT_DESTINATION;
        const isDestinationLotError = !this.elAddActionDestinationLotError.classList.contains('hidden');
        if (isActionAtLot && requiresAtDestination.length && isDestinationLotError) {
            // Do NOT submit the add-action form, if source lot ID is equal to destination lot ID
            const messageHtml = 'Different lot required at destination';
            NotificationService.createNotification(messageHtml, true);
            return;
        }
        const activeCrew = crewService.activeCrew;
        const actionSubject = this.addActionSubjectDropdown.getSelectedValue();
        let source = null;
        let sourceId = null;
        if (isActionAtLot) {
            if (this.addActionLotDropdown.noOption) {
                // Do NOT submit the add-action form, if no lot initialized
                const messageHtml = 'Lot required for this action type. You can add a lot using the "Manage Lots" panel.';
                NotificationService.createNotification(messageHtml, true);
                return;
            }
            sourceId = this.addActionLotDropdown.getSelectedValue();
            const sourceLot = crewService.getLotByIdForActiveCrewAndAsteroid(sourceId);
            source = sourceLot.asset || 'Empty Lot';
        } else {
            sourceId = activeCrew.asteroidId;
            source = asteroidService.asteroidsById[sourceId].name;
        }
        let destination = null;
        let destinationId = null;
        if (requiresAtDestination.length) {
            if (isActionAtLot) {
                destinationId = this.addActionDestinationLotDropdown.getSelectedValue();
                const destinationLot = crewService.getLotByIdForActiveCrewAndAsteroid(destinationId);
                destination = destinationLot.asset || 'Empty Lot';
            } else {
                destinationId = 1234; //// TEST destination asteroid ID
                // destination = asteroidService.asteroidsById[destinationId].name; //// TO BE ENABLED
                destination = `TEST'N'ROID`; //// TEST
            }
        }
        const durationRuntime = actionTypeData.RUNTIME_DURATION;
        const action = new Action(
            activeCrew.id,          // crewId
            activeCrew.asteroidId,  // asteroidId
            actionType,             // type
            actionSubject,          // subject
            source,                 // source
            sourceId,               // sourceId
            destination,            // destination
            destinationId,          // destinationId
            durationRuntime,        // durationRuntime
        );
        action.injectListAndTimelineItem();
        if (document.getElementById('toggle-add-action-top-priority').checked) {
            action.moveToTopOfQueue(false);
        }
        actionService.addEventListenersForDraggable(action.elListItem);
        actionService.updateQueuedActionsReadiness();
        action.flashListItem();
    }

    updateTimelineReadyCount() {
        let timelineReadyCount = 0;
        for (const action of Object.values(this.actionsById)) {
            if (action.state === ACTION_STATE.ONGOING && action.isReady) {
                timelineReadyCount++;
            }
        }
        this.elTimelineReadyCount.textContent = timelineReadyCount;
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

globalThis.onSubmitAddAction = function() {
    actionService.submitAddActionForm();
}

globalThis.onHoverTimelineReady = function(isMouseOver) {
    let timelineReadyIdx = 0;
    for (const action of Object.values(actionService.actionsById)) {
        if (action.state === ACTION_STATE.ONGOING && action.isReady) {
            timelineReadyIdx++;
            if (isMouseOver) {
                action.elTimelineItem.classList.add('expand-timeline-ready', 'highlight');
                action.elTimelineItem.style.setProperty('--offset-y-index', `${timelineReadyIdx}`);
            } else {
                action.elTimelineItem.classList.remove('expand-timeline-ready', 'highlight');
                action.elTimelineItem.style.setProperty('--offset-y-index', `0`);
            }
        }
    }
}

// Initialize add-action-type dropdown
actionService.initializeAddActionTypeDropdown();

// Initialize add-action-subject dropdown
actionService.initializeAddActionSubjectDropdown();

// Initialize add-action-lot dropdowns (source + destination)
actionService.initializeAddActionLotDropdowns();

// Initialize add-action-destination-asteroid dropdown
actionService.initializeAddActionDestinationAsteroidDropdowns();

// Update add-action-panel after all dropdowns initialized, using the pre-selected action type
actionService.onSelectAddActionTypeOption(actionService.addActionTypeDropdown.getSelectedValue());

export {
    Action,
    ACTION_STATE,
    ACTION_TYPE,
};
