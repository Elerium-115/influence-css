import {getPseudoUniqueId, msToShortTime} from './abstract.js'

class Crew {
    constructor(name) {
        this.id = getPseudoUniqueId();
        this.name = name;
        this.asteroidId = null; // asteroid ID where this crew is currently located
        this.isLanded = true; // TRUE if landed, FALSE if in orbit or traveling between asteroids
        this.baseLotId = null; // lot ID (on "asteroidId") where this crew is currently based (NULL if not landed)
        this.baseAssetName = null; // name of habitable asset owned / available to this crew at "baseLotId"
        this.cooldown = 0; // number as milliseconds
        crewService.addCrew(this);
    }

    setAsteroidId(asteroidId) {
        this.asteroidId = asteroidId;
        // Update all occurrences of the active asteroid name and ID in the DOM
        document.querySelectorAll('.active-asteroid-name').forEach(el => {
            el.textContent = asteroidsById[asteroidId].name;
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
            el.textContent = baseAssetName ? baseAssetName : '';
        });
        document.querySelectorAll('.active-base-lot-id').forEach(el => {
            el.textContent = baseLotId ? `#${baseLotId}` : 'In Orbit';
        });
    }

    updateCrewReadiness() {
        const elSelectedCrew = document.getElementById('active-crew');
        if (this.cooldown) {
            elSelectedCrew.querySelector('.crew-readiness').innerHTML = /*html*/ `
                ready in <span class="text-pulse">${msToShortTime(this.cooldown)}</span>
            `;
            elSelectedCrew.classList.remove('ready');
        } else {
            elSelectedCrew.querySelector('.crew-readiness').textContent = 'ready';
            elSelectedCrew.classList.add('ready');
        }
    }

    setCooldown(cooldown) {
        this.cooldown = cooldown;
        this.updateCrewReadiness();
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

    toggleActiveCrew(forceInactive = false) {
        const elActiveCrewButton = document.getElementById('active-crew-button');
        const elActiveCrewPanel = document.getElementById('active-crew-panel');
        if (elActiveCrewButton.classList.contains('active') || forceInactive) {
            elActiveCrewButton.classList.remove('active');
            elActiveCrewPanel.classList.add('hidden');
        } else {
            this.toggleChangeCrew(true); // force inactive
            elActiveCrewButton.classList.add('active');
            elActiveCrewPanel.classList.remove('hidden');
        }
    }

    toggleChangeCrew(forceInactive = false) {
        const elChangeCrewButton = document.getElementById('change-crew-button');
        const elChangeCrewPanel = document.getElementById('change-crew-panel');
        if (elChangeCrewButton.classList.contains('active') || forceInactive) {
            elChangeCrewButton.classList.remove('active');
            elChangeCrewPanel.classList.add('hidden');
        } else {
            this.toggleActiveCrew(true); // force inactive
            elChangeCrewButton.classList.add('active');
            elChangeCrewPanel.classList.remove('hidden');
        }
    }
}

// Global variables and functions

globalThis.crewService = new CrewService();

globalThis.toggleActiveCrew = function() {
    crewService.toggleActiveCrew();
}

globalThis.toggleChangeCrew = function() {
    crewService.toggleChangeCrew();
}

export {Crew, CrewService};
