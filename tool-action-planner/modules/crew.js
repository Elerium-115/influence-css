import {deleteFromArray, deleteFromDOM, getPseudoUniqueId, msToShortTime} from './abstract.js';
import {ACTION_STATE} from './action.js';
import {Lot, LOT_STATE, LOT_STATE_TEXT_SHORT} from './lot.js';

const CREW_INVOLVEMENT = {
    FINALIZING: 'Finalizing',
    REQUIRED_FOR_DURATION: 'Required for Duration',
    STARTING: 'Starting',
};

class Crew {
    constructor(name) {
        this.id = getPseudoUniqueId();
        this.name = name;
        this.asteroidId = null; // asteroid ID where this crew is currently located
        this.isLanded = true; // TRUE if landed, FALSE if in orbit or traveling between asteroids
        this.baseLotId = null; // lot ID (on "asteroidId") where this crew is currently based (NULL if not landed)
        this.baseAssetName = null; // name of habitable asset owned / available to this crew at "baseLotId"
        this.cooldown = 0; // number as milliseconds
        this.cooldownActionId = null; // action ID that triggered the crew cooldown
        this.cooldownStartedDate = null;
        this.refreshCooldownInterval = null;
        this.lotsByAsteroidId = {}; // array of "Lot" associated with each asteroid ID
        crewService.addCrew(this);
    }

    setAsteroidId(asteroidId) {
        this.asteroidId = asteroidId;
        // Update all occurrences of the active asteroid name and ID in the DOM
        document.querySelectorAll('.active-asteroid-name').forEach(el => {
            el.textContent = `(${asteroidService.asteroidsById[asteroidId].name})`;
        });
        document.querySelectorAll('.active-asteroid-id').forEach(el => {
            el.textContent = `#${asteroidId}`;
        });
    }

    setIsLanded(isLanded) {
        this.isLanded = isLanded;
        // Update landed status in DOM
        document.querySelector('.landed-or-in-orbit').textContent = isLanded ? 'landed on' : 'in orbit of';
        if (!isLanded) {
            this.setBase(null, null);
        }
    }

    setBase(baseLotId, baseAssetName) {
        this.baseLotId = baseLotId;
        this.baseAssetName = baseAssetName;
        // Update all occurrences of the active base asset name and lot ID in the DOM
        document.querySelectorAll('.active-base-asset-name').forEach(el => {
            el.textContent = baseAssetName ? `(${baseAssetName})` : '';
        });
        document.querySelectorAll('.active-base-lot-id').forEach(el => {
            el.textContent = baseLotId ? `Lot ${baseLotId}` : 'In Orbit';
        });
    }

    getCooldownTimeRemainingMs() {
        if (!this.cooldown) {
            return null;
        }
        return this.cooldownStartedDate.getTime() + this.cooldown - Date.now();
    }

    updateCrewReadiness() {
        const elSelectedCrew = document.getElementById('active-crew');
        const elCrewReadiness = elSelectedCrew.querySelector('.crew-readiness');
        const cooldownTimeRemainingMs = this.getCooldownTimeRemainingMs();
        if (cooldownTimeRemainingMs && cooldownTimeRemainingMs > 0) {
            const cooldownRemainingShort = msToShortTime(cooldownTimeRemainingMs, true);
            elCrewReadiness.textContent = `ready ${cooldownRemainingShort}`; // e.g. "ready in 5s"
            elSelectedCrew.classList.remove('ready');
            elSelectedCrew.classList.add('text-warning');
            elCrewReadiness.classList.add('text-pulse');
            const crewAction = crewService.getActiveCrewAction();
            /**
             * Set tooltip text for crew-action via data-attribute, instead of CSS var,
             * due to issues w/ assigning a string type to the CSS property "content".
             * See: https://stackoverflow.com/a/64338767/11071601
             */
            elSelectedCrew.dataset.crewActionText = `${crewAction.getActionText()} - ${crewAction.getCrewInvolvement()}`;
        } else {
            elCrewReadiness.textContent = 'ready';
            elCrewReadiness.classList.remove('text-pulse');
            elSelectedCrew.classList.remove('text-warning');
            elSelectedCrew.classList.add('ready');
            // Bypass calling this function again from "clearCooldown", to avoid infinite loop
            this.clearCooldown(true);
            // Remove tooltip text for crew-action
            delete elSelectedCrew.dataset.crewActionText;
            // Stop highlighting the list-item for the previous crew-action, in case the mouse is still hovering over "#active-crew"
            onHoverActiveCrew(false);
        }
    }

    clearCooldown(bypassUpdateCrewReadiness = false) {
        this.cooldown = 0;
        this.cooldownActionId = null;
        this.cooldownStartedDate = null;
        if (this.refreshCooldownInterval) {
            clearInterval(this.refreshCooldownInterval);
        }
        this.refreshCooldownInterval = null;
        if (!bypassUpdateCrewReadiness) {
            this.updateCrewReadiness();
        }
    }

    startCooldown(cooldown, actionId) {
        if (!cooldown) {
            console.log(`%c--- ERROR: cooldown value invalid or zero => can NOT start cooldown`, 'color: orange;');
            return;
        }
        this.cooldown = cooldown;
        this.cooldownActionId = actionId;
        this.cooldownStartedDate = new Date();
        this.updateCrewReadiness();
        this.refreshCooldownInterval = setInterval(() => this.updateCrewReadiness(), 1000); // refresh every 1 second
    }

    initializeLot(lotId, asteroidId, lotState = LOT_STATE.EMPTY, lotAssetName = null) {
        if (!this.lotsByAsteroidId[asteroidId]) {
            this.lotsByAsteroidId[asteroidId] = [];
        }
        const asteroidLots = this.lotsByAsteroidId[asteroidId];
        if (asteroidLots.find(lot => lot.id === lotId)) {
            console.log(`%c--- ERROR: lotId already initialized on asteroidId for this crew => can NOT initialize lot`, 'color: orange;');
            return;
        }
        const lot = new Lot(lotId, lotState, lotAssetName);
        asteroidLots.push(lot);
        asteroidLots.sort((a, b) => a.id > b.id);
        this.injectLotsListItem(lot);
    }

    /**
     * NOTE: This method always returns the basic HTML for a lots-list item, without detailing the lot's state
     * based on any action. That is done separately, when the action's state changes, via "Action.updateLotsList".
     */
    getLotsListItemHtml(lot) {
        return /*html*/ `
            <li id="lot_${lot.id}">
                <div class="lot-id">${lot.id}</div>
                <div class="lot-asset">${lot.assetName || ''}</div>
                <div class="lot-state" data-state-class="${lot.getLotStateClass()}">${LOT_STATE_TEXT_SHORT[lot.state]}</div>
                <div class="lot-actions"></div>
                <div class="lot-abandon" data-abandon-lot-id="Abandon Lot #${lot.id}" onclick="onAbandonLotId(${lot.id})"></div>
            </li>
        `;
    }

    injectLotsListItem(lot) {
        const lotsList = document.getElementById('manage-lots-list');
        if (!lotsList.childElementCount) {
            lotsList.innerHTML = /*html*/ `
                <li class="header">
                    <div>Lot</div>
                    <div>Asset</div>
                    <div>State</div>
                    <div>Ongoing Actions</div>
                </li>
            `;
        }
        const elTemp = document.createElement('div');
        elTemp.innerHTML = this.getLotsListItemHtml(lot);
        lot.elLotsListItem = elTemp.firstElementChild;
        // Inject before the next-highest lot ID
        const asteroidLots = this.lotsByAsteroidId[this.asteroidId];
        const nextHighestIdLot = asteroidLots[asteroidLots.indexOf(lot) + 1];
        if (nextHighestIdLot) {
            nextHighestIdLot.elLotsListItem.insertAdjacentElement('beforebegin', lot.elLotsListItem);
        } else {
            // This is the new longest ongoing action
            lotsList.append(lot.elLotsListItem);
        }
    }
}

class CrewService {
    constructor() {
        this.crews = []; // array of "Crew"
        this.activeCrew = null; // instance of "Crew"
    }

    addCrew(crew) {
        if (this.crews.includes(crew)) {
            console.log(`%c--- ERROR: crew is already added => can NOT add crew`, 'color: orange;');
            return;
        }
        this.crews.push(crew);
        if (!this.activeCrew) {
            // Make the first crew active by default
            this.setActiveCrew(crew);
        }
    }

    setActiveCrew(crew) {
        if (!this.crews.includes(crew)) {
            console.log(`%c--- ERROR: crew is not added => can NOT set active crew`, 'color: orange;');
            return;
        }
        this.activeCrew = crew;
        // Update all occurrences of the active crew name in the DOM
        document.querySelectorAll('.active-crew-name').forEach(el => {
            el.textContent = crew.name;
        });
        crew.updateCrewReadiness();
    }

    getActiveCrewAction() {
        const crewActionId = this.activeCrew.cooldownActionId;
        if (!crewActionId) {
            return null;
        }
        return actionService.actionsById[crewActionId];
    }

    getLotsForActiveCrewAndAsteroid() {
        const activeCrew = this.activeCrew;
        return activeCrew.lotsByAsteroidId[activeCrew.asteroidId];
    }

    getLotByIdForActiveCrewAndAsteroid(lotId) {
        const lots = crewService.getLotsForActiveCrewAndAsteroid();
        return lots.find(lot => lot.id === lotId);
    }

    toggleManageLots() {
        const elManageLotsButton = document.getElementById('manage-lots-button');
        const elManageLotsPanel = document.getElementById('manage-lots-panel');
        if (elManageLotsButton.classList.contains('active')) {
            elManageLotsButton.classList.remove('active');
            elManageLotsPanel.classList.add('hidden');
        } else {
            closeConfigPanels();
            elManageLotsButton.classList.add('active');
            elManageLotsPanel.classList.remove('hidden');
        }
    }

    toggleActiveCrew() {
        const elActiveCrewButton = document.getElementById('active-crew-button');
        const elActiveCrewPanel = document.getElementById('active-crew-panel');
        if (elActiveCrewButton.classList.contains('active')) {
            elActiveCrewButton.classList.remove('active');
            elActiveCrewPanel.classList.add('hidden');
        } else {
            closeConfigPanels();
            elActiveCrewButton.classList.add('active');
            elActiveCrewPanel.classList.remove('hidden');
        }
    }

    toggleChangeCrew() {
        const elChangeCrewButton = document.getElementById('change-crew-button');
        const elChangeCrewPanel = document.getElementById('change-crew-panel');
        if (elChangeCrewButton.classList.contains('active')) {
            elChangeCrewButton.classList.remove('active');
            elChangeCrewPanel.classList.add('hidden');
        } else {
            closeConfigPanels();
            elChangeCrewButton.classList.add('active');
            elChangeCrewPanel.classList.remove('hidden');
        }
    }

    abandonLotId(lotId) {
        const lots = this.getLotsForActiveCrewAndAsteroid();
        const matchingLot = lots.find(lot => lot.id === lotId);
        // Mark the lot as being abandoned, BEFORE starting to remove related actions
        matchingLot.isBeingAbandoned = true;
        /**
         * Remove all actions related to this lot (based on "sourceId" OR "destinationId"),
         * regardless of state, for the currently active crew + asteroid.
         */
        for (const action of actionService.getActionsForActiveCrewAtLotId(lotId, true)) {
            action.removeAction(true);
        }
        // Remove the lot, including from the HTML
        const elLotsListItem = matchingLot.elLotsListItem;
        const elLotsListItemHeight = elLotsListItem.getBoundingClientRect().height;
        elLotsListItem.style.setProperty('--this-height', `${elLotsListItemHeight}px`);
        elLotsListItem.classList.add('abandoning');
        setTimeout(() => {
            deleteFromDOM(elLotsListItem);
            deleteFromArray(lots, matchingLot);
        }, 300);
    }

    getConfirmationHtmlForAbandonLotId(lotId) {
        /**
         * List all actions related to this lot (based on "sourceId" OR "destinationId"),
         * regardless of state, for the currently active crew + asteroid.
         */
        let queuedActionsHtml = '';
        let ongoingActionsHtml = '';
        let doneActionsHtml = '';
        for (const action of actionService.getActionsForActiveCrewAtLotId(lotId, true)) {
            const listItemHtml = /*html*/ `<li>${action.getActionText(true, true)}</li>`;
            switch (action.state) {
                case ACTION_STATE.QUEUED:
                    queuedActionsHtml += listItemHtml;
                    break;
                case ACTION_STATE.ONGOING:
                    ongoingActionsHtml += listItemHtml;
                    break;
                case ACTION_STATE.DONE:
                    doneActionsHtml += listItemHtml;
                    break;
            }
        }
        let messageHtml = /*html*/ `
            <h2>Abandon Lot ${lotId}?</h2>
            <div>Accepting this will <span class="warning">delete Lot ${lotId}</span> for the active crew, and all their <span class="warning">actions related to this lot</span>:</div>
        `;
        if (queuedActionsHtml) {
            messageHtml += /*html*/ `
                <div class="list-wrapper">
                    <div class="list-header">Queued Actions</div>
                    <ul>${queuedActionsHtml}</ul>
                </div>
            `;
        }
        if (ongoingActionsHtml) {
            messageHtml += /*html*/ `
                <div class="list-wrapper">
                    <div class="list-header">Ongoing Actions</div>
                    <ul>${ongoingActionsHtml}</ul>
                </div>
            `;
        }
        if (doneActionsHtml) {
            messageHtml += /*html*/ `
                <div class="list-wrapper">
                    <div class="list-header">Done Actions</div>
                    <ul>${doneActionsHtml}</ul>
                </div>
            `;
        }
        return messageHtml;
    }
}

// Global variables and functions

globalThis.crewService = new CrewService();

globalThis.onHoverActiveCrew = function(isMouseOver) {
    const activeCrewAction = crewService.getActiveCrewAction();
    if (isMouseOver && activeCrewAction) {
        // Highlight list-item for crew-action, if crew not ready
        activeCrewAction.elListItem.classList.add('highlight');
    } else {
        /**
         * Stop highlighting the list-item for crew-action, if the crew became ready while still hovering over it.
         * Select the first ongoing-or-done list-item with class "highlight", if any.
         * Not using "activeCrewAction.elListItem" b/c there may not be any crew-action at this point.
         */
        const elListItemHighlight = document.querySelector('#actions-ongoing ul li.highlight, #actions-done ul li.highlight');
        if (elListItemHighlight) {
            elListItemHighlight.classList.remove('highlight');
        }
    }
}

globalThis.onToggleManageLots = function() {
    crewService.toggleManageLots();
}

globalThis.onToggleActiveCrew = function() {
    crewService.toggleActiveCrew();
}

globalThis.onToggleChangeCrew = function() {
    crewService.toggleChangeCrew();
}

globalThis.onAbandonLotId = function(lotId) {
    const elToggleAutoconfirmAbandonLot = document.getElementById('toggle-autoconfirm-abandon-lot');
    if (elToggleAutoconfirmAbandonLot && elToggleAutoconfirmAbandonLot.checked) {
        // Auto-confirm abandon lot
        crewService.abandonLotId(lotId);
    } else {
        notificationService.createConfirmation(
            crewService.getConfirmationHtmlForAbandonLotId(lotId),
            () => crewService.abandonLotId(lotId),
        );
    }
}

export {Crew, CrewService, CREW_INVOLVEMENT};
