import {getPseudoUniqueId} from './abstract.js'

class Crew {
    constructor(crewName) {
        this.id = getPseudoUniqueId();
        this.crewName = crewName;
        crewService.addCrew(this);
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
        // Update selected crew and readiness in DOM
        const elSelectedCrew = document.getElementById('selected-crew');
        elSelectedCrew.querySelector('.crew-name').textContent = crew.crewName;
        elSelectedCrew.querySelector('.crew-readiness').textContent = 'ready'; //// TEST
        elSelectedCrew.classList.add('ready'); //// TEST
    }

    toggleManageCrew() {
        document.getElementById('manage-crew').classList.toggle('hidden');
    }
}

// Global variables and functions

globalThis.crewService = new CrewService();

globalThis.toggleManageCrew = function() {
    crewService.toggleManageCrew();
}

export {Crew, CrewService};
