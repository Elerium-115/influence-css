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

const LOT_STATE_TEXT_SHORT = {
    BUILDING_COMPLETED: 'Ready',
    BUILDING_SITE_PLAN: 'Planned',
    BUILDING_UNDER_CONSTRUCTION: 'Under Construction',
    BUILDING_UNDER_DECONSTRUCTION: 'Under Deconstruction',
    EMPTY: 'Empty',
    SHIP_LANDED: 'Ship Landed',
    SHIP_LANDING: 'Ship Landing',
    SHIP_LAUNCHING: 'Ship Launching',
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

    isAssetAvailableOnLot() {
        return [
            LOT_STATE.BUILDING_COMPLETED,
            LOT_STATE.SHIP_LANDED,
        ].includes(this.state);
    }

    getLotStateClass() {
        if (this.assetName && !this.isAssetAvailableOnLot()) {
            return 'unavailable';
        }
        return 'available';
    }
}

export {Lot, LOT_STATE, LOT_STATE_TEXT_SHORT};
