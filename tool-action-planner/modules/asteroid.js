import {Lot, LOT_STATE, LOT_STATE_TEXT_SHORT} from './lot.js';

class Asteroid {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.lots = []; // array of "Lot"
        asteroidService.asteroidsById[id] = this;
    }

    initializeLot(lotId, lotState, lotAssetName) {
        //// TO DO: ensure this "lotId" does not already exist in "this.lots"
        const lot = new Lot(lotId, lotState, lotAssetName);
        this.lots.push(lot);
        this.lots.sort((a, b) => a.id > b.id);
        document.getElementById('manage-lots-list').innerHTML = this.getManageLotsListHtml();
    }

    getManageLotsListHtml() {
        let listHtml = /*html*/ `
            <li class="header">
                <div>Lot</div>
                <div>Asset</div>
                <div>State</div>
            </li>
        `;
        for (const lot of this.lots) {
            let stateClass = [LOT_STATE.BUILDING_SITE_PLAN, LOT_STATE.BUILDING_UNDER_CONSTRUCTION].includes(lot.state) ? 'unavailable' : 'available';
            //// TO DO: determine the state of assets that can be "activated" - e.g. active Extractor has state "Extracting"
            let stateText = LOT_STATE_TEXT_SHORT[lot.state];
            //// TEST - hardcoding for Extractor at lot 89
            if (lot.id === 89) {
                stateClass = 'active';
                stateText = 'Extracting: Water';
            }
            listHtml += /*html*/ `
                <li>
                    <div>${lot.id}</div>
                    <div>${lot.assetName || ''}</div>
                    <div class="${stateClass}">${stateText}</div>
                </li>
            `;
        }
        return listHtml;
    }
}

class AsteroidService {
    constructor() {
        this.asteroidsById = {};
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
}

// Global variables and functions

globalThis.asteroidService = new AsteroidService();

globalThis.onToggleManageLots = function() {
    asteroidService.toggleManageLots();
}

export {Asteroid};
