const LOT_STATE = {
    EMPTY: 'EMPTY',
    SHIP_LANDED: 'SHIP_LANDED',
    BUILDING_SITE_PLAN: 'BUILDING_SITE_PLAN',
    BUILDING_UNDER_CONSTRUCTION: 'BUILDING_UNDER_CONSTRUCTION',
    BUILDING_COMPLETED: 'BUILDING_COMPLETED',
};

const LOT_STATE_TEXT_SHORT = {
    EMPTY: 'Empty',
    SHIP_LANDED: 'Landed',
    BUILDING_SITE_PLAN: 'Site Plan',
    BUILDING_UNDER_CONSTRUCTION: 'Under Construction',
    BUILDING_COMPLETED: 'Ready',
};

/**
 * Lots only exist within an asteroid's "lots" array, so they do not need an explicit asteroid ID
 */
class Lot {
    constructor(id, state, assetName = null) {
        this.id = id;
        this.state = state; // expecting "LOT_STATE" value
        this.assetName = assetName; // name of asset located at this lot (only for non-empty lots)
    }
}

export {Lot, LOT_STATE, LOT_STATE_TEXT_SHORT};
