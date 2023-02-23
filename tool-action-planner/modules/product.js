import {InfluenceProductionChainsJSON} from './influence-production-chains.js';

const BUILDING_NAMES = InfluenceProductionChainsJSON.buildings
    .filter(buildingData => buildingData.name !== 'Empty Lot')
    .map(buildingData => buildingData.name)
    .sort();

const PRODUCT_NAMES = [];

const RESOURCE_NAMES = [];

const SHIP_NAMES = [
    'Heavy Transport',
    'Light Transport',
    'Shuttle',
];

const SHIP_NAMES_CAN_LAND_WITHOUT_SPACEPORT = [
    'Light Transport',
];

for (const productDataRaw of InfluenceProductionChainsJSON.products) {
    const productName = productDataRaw.name;
    PRODUCT_NAMES.push(productName);
    if (productDataRaw.type === 'Raw Material') {
        RESOURCE_NAMES.push(productName);
    }
}

PRODUCT_NAMES.sort();

RESOURCE_NAMES.sort();

export {
    BUILDING_NAMES,
    PRODUCT_NAMES,
    RESOURCE_NAMES,
    SHIP_NAMES,
    SHIP_NAMES_CAN_LAND_WITHOUT_SPACEPORT,
};
