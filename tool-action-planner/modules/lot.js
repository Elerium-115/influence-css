import {Dropdown} from './dropdown.js';

const LOT_ASSET = {
    EXTRACTOR: 'EXTRACTOR',
    FACTORY: 'FACTORY',
    FARM: 'FARM',
    HABITAT: 'HABITAT',
    LIGHT_TRANSPORT: 'LIGHT_TRANSPORT',
    MARKETPLACE: 'MARKETPLACE',
    REFINERY: 'REFINERY',
    SHIPYARD: 'SHIPYARD',
    SPACEPORT: 'SPACEPORT',
    WAREHOUSE: 'WAREHOUSE',
};

const LOT_ASSET_DATA = {
    EXTRACTOR:          {IS_BUILDING: true, IS_SHIP: false, NAME: 'Extractor'},
    FACTORY:            {IS_BUILDING: true, IS_SHIP: false, NAME: 'Factory'},
    FARM:               {IS_BUILDING: true, IS_SHIP: false, NAME: 'Farm'},
    HABITAT:            {IS_BUILDING: true, IS_SHIP: false, NAME: 'Habitat'},
    LIGHT_TRANSPORT:    {IS_BUILDING: false, IS_SHIP: true, NAME: 'Light Transport'},
    MARKETPLACE:        {IS_BUILDING: true, IS_SHIP: false, NAME: 'Marketplace'},
    REFINERY:           {IS_BUILDING: true, IS_SHIP: false, NAME: 'Refinery'},
    SHIPYARD:           {IS_BUILDING: true, IS_SHIP: false, NAME: 'Shipyard'},
    SPACEPORT:          {IS_BUILDING: true, IS_SHIP: false, NAME: 'Spaceport'},
    WAREHOUSE:          {IS_BUILDING: true, IS_SHIP: false, NAME: 'Warehouse'},
};

const LOT_STATE = {
    BUILDING_COMPLETED: 'BUILDING_COMPLETED',
    BUILDING_SITE_PLAN: 'BUILDING_SITE_PLAN',
    BUILDING_UNDER_CONSTRUCTION: 'BUILDING_UNDER_CONSTRUCTION',
    BUILDING_UNDER_DECONSTRUCTION: 'BUILDING_UNDER_DECONSTRUCTION',
    EMPTY: 'EMPTY',
    SHIP_LANDED: 'SHIP_LANDED',
    SHIP_LANDING: 'SHIP_LANDING',
    SHIP_LAUNCHING: 'SHIP_LAUNCHING',
};

const LOT_STATE_DATA = {
    BUILDING_COMPLETED:             {IS_BUILDING_STATE: true, IS_SHIP_STATE: false, REQUIRES_ONGOING_ACTION: false, TEXT_SHORT: 'Ready'},
    BUILDING_SITE_PLAN:             {IS_BUILDING_STATE: true, IS_SHIP_STATE: false, REQUIRES_ONGOING_ACTION: false, TEXT_SHORT: 'Planned'},
    BUILDING_UNDER_CONSTRUCTION:    {IS_BUILDING_STATE: true, IS_SHIP_STATE: false, REQUIRES_ONGOING_ACTION: true, TEXT_SHORT: 'Under Construction'},
    BUILDING_UNDER_DECONSTRUCTION:  {IS_BUILDING_STATE: true, IS_SHIP_STATE: false, REQUIRES_ONGOING_ACTION: true, TEXT_SHORT: 'Under Deconstruction'},
    EMPTY:                          {IS_BUILDING_STATE: false, IS_SHIP_STATE: false, REQUIRES_ONGOING_ACTION: false, TEXT_SHORT: 'Empty'},
    SHIP_LANDED:                    {IS_BUILDING_STATE: false, IS_SHIP_STATE: true, REQUIRES_ONGOING_ACTION: false, TEXT_SHORT: 'Ship Landed'},
    SHIP_LANDING:                   {IS_BUILDING_STATE: false, IS_SHIP_STATE: true, REQUIRES_ONGOING_ACTION: true, TEXT_SHORT: 'Ship Landing'},
    SHIP_LAUNCHING:                 {IS_BUILDING_STATE: false, IS_SHIP_STATE: true, REQUIRES_ONGOING_ACTION: true, TEXT_SHORT: 'Ship Launching'},
};

/**
 * Lots only exist within a crew's "lotsByAsteroidId",
 * so they do not need an explicit asteroid ID or crew ID.
 */
class Lot {
    constructor(id, asset = null, state = LOT_STATE.EMPTY) {
        this.id = id;
        this.asset = null; // updated via "setAsset"
        this.assetName = null; // updated via "setAsset"
        this.setAsset(asset); // expecting "LOT_ASSET" value, i.e. building or ship located at this lot (only for non-empty lots)
        this.state = state; // expecting "LOT_STATE" value
        this.isBeingAbandoned = false;
        this.elLotsListItem = null;
    }

    setAsset(asset) {
        this.asset = asset;
        this.assetName = LOT_ASSET_DATA[asset]?.NAME || '';
    }

    isAssetAvailableOnLot() {
        return [
            LOT_STATE.BUILDING_COMPLETED,
            LOT_STATE.SHIP_LANDED,
        ].includes(this.state);
    }

    getLotStateClass() {
        if (this.asset && !this.isAssetAvailableOnLot()) {
            return 'unavailable';
        }
        return 'available';
    }
}

class LotService {
    constructor() {
        this.elAddLotWrapper = document.getElementById('add-lot-wrapper');
        this.elAddLotButton = document.getElementById('add-lot-button');
        this.elAddLotInputId = document.getElementById('add-lot-input-id');
        this.elAddLotAssetDropdown = document.getElementById('add-lot-asset-dropdown');
        this.addLotAssetDropdown = null;
        this.elAddLotStateDropdown = document.getElementById('add-lot-state-dropdown');
        this.addLotStateDropdown = null;
        this.elAddLotError = document.getElementById('add-lot-error');
    }

    getNameIfLotAsset(potentialLotAsset) {
        return LOT_ASSET[potentialLotAsset] ? LOT_ASSET_DATA[potentialLotAsset].NAME : potentialLotAsset;
    }

    getAddLotStateRawOptionsData() {
        const optionsData = [];
        for (const lotState of Object.keys(LOT_STATE)) {
            if (LOT_STATE_DATA[lotState].REQUIRES_ONGOING_ACTION) {
                /**
                 * Skip lot-states which require an ongoing action,
                 * b/c adding a new lot will NOT create any action.
                 */
                continue;
            }
            optionsData.push({
                text: LOT_STATE_DATA[lotState].TEXT_SHORT,
                value: lotState,
            });
        };
        return optionsData;
    }

    getAddLotAssetOptionsData() {
        // Inject "None" option
        const optionsData = [{
            text: 'None',
            value: '',
        }];
        // Inject option-group for buildings
        optionsData.push({
            isOptionGroupLabel: true,
            text: 'Buildings',
            value: '',
        });
        for (const lotAsset of Object.keys(LOT_ASSET)) {
            if (LOT_ASSET_DATA[lotAsset].IS_BUILDING) {
                optionsData.push({
                    isOptionGroup: true,
                    text: LOT_ASSET_DATA[lotAsset].NAME,
                    value: lotAsset,
                });
            }
        };
        // Inject option-group for ships
        optionsData.push({
            isOptionGroupLabel: true,
            text: 'Ships',
            value: '',
        });
        for (const lotAsset of Object.keys(LOT_ASSET)) {
            if (LOT_ASSET_DATA[lotAsset].IS_SHIP) {
                optionsData.push({
                    isOptionGroup: true,
                    text: LOT_ASSET_DATA[lotAsset].NAME,
                    value: lotAsset,
                });
            }
        };
        return optionsData;
    }

    populateAddLotAssetDropdown() {
        this.addLotAssetDropdown = new Dropdown(
            this.elAddLotAssetDropdown,
            this.updateAddLotStateDropdownForLotAsset.bind(this),
        );
        this.addLotAssetDropdown.setOptions(this.getAddLotAssetOptionsData());
        this.addLotAssetDropdown.updateOptionsMaxWidth();
    }

    populateAddLotStateDropdown() {
        this.addLotStateDropdown = new Dropdown(this.elAddLotStateDropdown);
        this.addLotStateDropdown.setOptions(this.getAddLotStateRawOptionsData());
        // Select lot-state based on pre-selected lot-asset
        this.updateAddLotStateDropdownForLotAsset(null, false);
    }

    updateAddLotStateDropdownForLotAsset(lotAsset = null, shouldUpdateMaxWidth = true) {
        // Reset options in lot-state dropdown
        let optionsData = [];
        if (!lotAsset) {
            // Empty lot => single lot-state option "EMPTY" => auto-selected
            optionsData = [{
                text: LOT_STATE_DATA[LOT_STATE.EMPTY].TEXT_SHORT,
                value: LOT_STATE.EMPTY,
            }];
        } else {
            // Parse the "raw" lot-state options, keeping only the options that are valid for the selected lot-asset
            optionsData = this.getAddLotStateRawOptionsData().filter(optionData => {
                if (LOT_ASSET_DATA[lotAsset].IS_BUILDING) {
                    // Building asset on lot => keep all building-related lot-state options
                    return LOT_STATE_DATA[optionData.value].IS_BUILDING_STATE;
                }
                if (LOT_ASSET_DATA[lotAsset].IS_SHIP) {
                    // Ship asset on lot => keep all ship-related lot-state options
                    return LOT_STATE_DATA[optionData.value].IS_SHIP_STATE;
                }
            });
        }
        this.addLotStateDropdown.setOptions(optionsData);
        if (lotAsset) {
            if (LOT_ASSET_DATA[lotAsset].IS_BUILDING) {
                // Building asset on lot => select lot-state "BUILDING_COMPLETED"
                this.addLotStateDropdown.selectOptionByValue(LOT_STATE.BUILDING_COMPLETED);
            }
            if (LOT_ASSET_DATA[lotAsset].IS_SHIP) {
                // Ship asset on lot => select lot-state "SHIP_LANDED"
                this.addLotStateDropdown.selectOptionByValue(LOT_STATE.SHIP_LANDED);
            }
        }
        if (shouldUpdateMaxWidth) {
            this.addLotStateDropdown.updateOptionsMaxWidth();
        }
    }

    showAddLotForm() {
        this.elAddLotWrapper.classList.add('active');
        this.elAddLotButton.classList.add('submit');
        this.addLotAssetDropdown.updateOptionsMaxWidth();
        this.addLotStateDropdown.updateOptionsMaxWidth();
    }

    resetAddLotForm() {
        this.elAddLotInputId.value = '';
        this.addLotAssetDropdown.selectOptionByValue('');
        // Select lot-state based on newly-selected lot-asset
        this.updateAddLotStateDropdownForLotAsset();
        this.elAddLotError.classList.add('hidden');
    }

    hideAddLotForm() {
        this.resetAddLotForm();
        this.elAddLotWrapper.classList.remove('active');
        this.elAddLotButton.classList.remove('submit');
    }

    getErrorForLotId(lotId) {
        if (!lotId) {
            return 'Lot ID is required.';
        }
        if (crewService.getLotByIdForActiveCrewAndAsteroid(lotId)) {
            return 'Lot ID already exists for this crew and asteroid.';
        }
        //// TO DO low-prio: MAX value = area of active asteroid
        return null;
    }

    submitAddLotForm() {
        const lotId = Number(this.elAddLotInputId.value);
        const errorForLotId = this.getErrorForLotId(lotId);
        if (errorForLotId) {
            this.elAddLotError.textContent = errorForLotId;
            this.elAddLotError.classList.remove('hidden');
            return;
        }
        const lotAsset = this.addLotAssetDropdown.getSelectedVaue();
        const lotState = this.addLotStateDropdown.getSelectedVaue();
        const activeCrew = crewService.activeCrew;
        activeCrew.initializeLot(activeCrew.asteroidId, lotId, lotAsset, lotState);
        this.hideAddLotForm();
    }
}

// Global variables and functions

globalThis.lotService = new LotService();

globalThis.onClickAddLotButton = function() {
    if (lotService.elAddLotWrapper.classList.contains('active')) {
        lotService.submitAddLotForm();
    } else {
        lotService.showAddLotForm();
    }
}

globalThis.onClickAddLotButtonCancel = function() {
    lotService.hideAddLotForm();
}

globalThis.validateAddLotInputId = function(el) {
    if (!el.value.length) {
        return;
    }
    const intValue = parseInt(el.value);
    const activeCrewAsteroidId = crewService.activeCrew.asteroidId;
    const maxLots = asteroidService.asteroidsById[activeCrewAsteroidId].maxLots;
    el.value = isNaN(intValue) || intValue < 1 ? 1 : Math.min(intValue, maxLots);
}

// FIRST populate add-lot form > select asset
lotService.populateAddLotAssetDropdown();

// THEN populate add-lot form > select state
lotService.populateAddLotStateDropdown();

export {
    Lot,
    LOT_ASSET,
    LOT_ASSET_DATA,
    LOT_STATE,
    LOT_STATE_DATA,
};
