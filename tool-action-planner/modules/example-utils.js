import {Action, ACTION_STATE, ACTION_TYPE} from './action.js';

/**
 * Example action template:
 * [type, subject, sourceName, sourceLotId, destinationName, destinationLotId, duration = 0, forceReady = false, forceState = null, forceFinalizedHoursAgo = null]
 */
const exampleActionsTemplate = [
    // Queued actions
    [ACTION_TYPE.EXTRACT,       'Hydrogen',         'Extractor',        123,    'Warehouse',        777,    8 * 3600 * 1000,    true                                ], // duration 8 hours
    [ACTION_TYPE.CORE_SAMPLE,   'Methane',          'Lot',              4567,   null,               null,   4 * 3600 * 1000,    true                                ], // duration 4 hours
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Lot',              4567,   null,               null,   12 * 3600 * 1000                                        ], // duration 12 hours
    [ACTION_TYPE.EXTRACT,       'Methane',          'Extractor',        4567,   'Warehouse',        777,    8 * 3600 * 1000                                         ], // duration 8 hours
    [ACTION_TYPE.DECONSTRUCT,   'Extractor',        'Extractor',        89,     'Warehouse',        777,    2 * 3600 * 1000                                         ], // duration 2 hours
    [ACTION_TYPE.TRANSFER,      '[multiple]',       'Warehouse',        777,    'Light Transport',  666,    1 * 3600 * 1000                                         ], // duration 1 hour
    // Ongoing actions
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Lot',              123,    null,               null,   0,                  true,   ACTION_STATE.ONGOING        ],
    [ACTION_TYPE.EXTRACT,       'Water',            'Extractor',        89,     'Warehouse',        777,    5 * 3600 * 1000,    false,  ACTION_STATE.ONGOING        ], // duration 5 hours
    [ACTION_TYPE.CONSTRUCT,     'Marketplace',      'Lot',              1,      null,               null,   23 * 3600 * 1000,   false,  ACTION_STATE.ONGOING        ], // duration 23 hours
    // Done actions, defined in reverse b/c they are prepended, NOT appended
    [ACTION_TYPE.CONSTRUCT,     'Warehouse',        'Lot',              777,    null,               null,   0,                  false,  ACTION_STATE.DONE,      96  ], // done 4 days ago
    [ACTION_TYPE.TRANSFER,      'Core Samplers',    'Light Transport',  666,    'Warehouse',        777,    0,                  false,  ACTION_STATE.DONE,      72  ], // done 3 days ago
    [ACTION_TYPE.CORE_SAMPLE,   'Water',            'Lot',              89,     null,               null,   0,                  false,  ACTION_STATE.DONE,      48  ], // done 2 days ago
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Lot',              89,     null,               null,   0,                  false,  ACTION_STATE.DONE,      24  ], // done 1 day ago
    [ACTION_TYPE.CORE_SAMPLE,   'Hydrogen',         'Lot',              123,    null,               null,   0,                  false,  ACTION_STATE.DONE,      18  ], // done 18 hours ago
];

function initializeExampleActionsById() {
    if (typeof actionsById === 'undefined') {
        globalThis.actionsById = {};
    }
    exampleActionsTemplate.forEach(actionTemplate => {
        const action = new Action(actionTemplate[0], actionTemplate[1], actionTemplate[2], actionTemplate[3], actionTemplate[4], actionTemplate[5], actionTemplate[6]);
        if (actionTemplate[7]) {
            // Force ready
            action.markReady();
        }
        if (actionTemplate[8]) {
            // Force state
            action.setState(actionTemplate[8]);
        }
        if (actionTemplate[9]) {
            // Force finalized hour ago
            action.finalizedDate.setHours(action.finalizedDate.getHours() - actionTemplate[9]);
        }
        action.injectListItem();
        actionsById[action.id] = action;
    });
}

export {initializeExampleActionsById};
