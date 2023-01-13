import {getPseudoUniqueId, msToShortTime} from './abstract.js';

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
        crewService.addCrew(this);
    }

    setAsteroidId(asteroidId) {
        this.asteroidId = asteroidId;
        // Update all occurrences of the active asteroid name and ID in the DOM
        document.querySelectorAll('.active-asteroid-name').forEach(el => {
            el.textContent = `(${asteroidsById[asteroidId].name})`;
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

    getActiveCrewAction() {
        const crewActionId = this.activeCrew.cooldownActionId;
        if (!crewActionId) {
            return null;
        }
        return actionService.actionsById[crewActionId];
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

globalThis.onToggleActiveCrew = function() {
    crewService.toggleActiveCrew();
}

globalThis.onToggleChangeCrew = function() {
    crewService.toggleChangeCrew();
}

export {Crew, CrewService};
