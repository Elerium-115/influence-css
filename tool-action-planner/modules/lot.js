import {ACTION_STATE, ACTION_TYPE} from './action.js';

const LOT_STATE = {
    ACTIVE: 'ACTIVE',
    BUILDING_COMPLETED: 'BUILDING_COMPLETED',
    BUILDING_SITE_PLAN: 'BUILDING_SITE_PLAN',
    BUILDING_UNDER_CONSTRUCTION: 'BUILDING_UNDER_CONSTRUCTION',
    BUILDING_UNDER_DECONSTRUCTION: 'BUILDING_UNDER_DECONSTRUCTION',
    EMPTY: 'EMPTY',
    SHIP_LANDED: 'SHIP_LANDED',
    SHIP_LAUNCHING: 'SHIP_LAUNCHING',
};

const LOT_STATE_TEXT_SHORT = {
    ACTIVE: 'Active',
    BUILDING_COMPLETED: 'Ready',
    BUILDING_SITE_PLAN: 'Site Plan',
    BUILDING_UNDER_CONSTRUCTION: 'Under Construction',
    BUILDING_UNDER_DECONSTRUCTION: 'Under Deconstruction',
    EMPTY: 'Empty',
    SHIP_LANDED: 'Landed',
    SHIP_LAUNCHING: 'Launching',
};

/**
 * Lots only exist within a crew's "lotsByAsteroidId",
 * so they do not need an explicit asteroid ID or crew ID.
 */
class Lot {
    constructor(id, state = LOT_STATE.EMPTY, assetName = null) {
        this.id = id;
        this.state = state; // expecting "LOT_STATE" value
        this.assetName = assetName; // name of asset located at this lot (only for non-empty lots)
        this.elLotsListItem = null;
    }

    getStateClassBasedOnAction(action = null) {
        let stateClass = [
            LOT_STATE.BUILDING_SITE_PLAN,
            LOT_STATE.BUILDING_UNDER_CONSTRUCTION,
            LOT_STATE.BUILDING_UNDER_DECONSTRUCTION,
        ].includes(this.state) ? 'unavailable' : 'available';
        // Use class "active" for ongoing action at Extractor / Refinery etc.
        const actionTypesCanBeActivated = [
            ACTION_TYPE.EXTRACT,
            ACTION_TYPE.REFINE,
        ];
        if (action && action.state === ACTION_STATE.ONGOING && actionTypesCanBeActivated.includes(action.type)) {
            stateClass = 'active';
        }
        return stateClass;
    }
}

export {Lot, LOT_STATE, LOT_STATE_TEXT_SHORT};
