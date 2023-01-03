import {HOUR} from './abstract.js';
import {Action, ACTION_STATE, ACTION_TYPE} from './action.js';
import {Crew} from './crew.js';
import {Asteroid} from './asteroid.js';

new Asteroid(1, 'Adalia Prime');
new Asteroid(296, 'Tortuga');

const exampleCrew = new Crew('Dragon');
exampleCrew.setAsteroidId(1); // Adalia Prime
exampleCrew.setIsLanded(true);
exampleCrew.setBase(666, 'Light Transport'); // Light Transport at lot #666
// exampleCrew.setIsLanded(false); //// TEST

/**
 * Example action template:
 * [type, subject, sourceName, sourceId, destinationName, destinationId, duration = 0, forceReady = false, forceState = null, forceFinalizedHoursAgo = null]
 */
const exampleActionsTemplate = [
    // Queued actions
    [ACTION_TYPE.EXTRACT,       'Hydrogen',         'Extractor',        123,    'Warehouse',        777,    0.0125 * HOUR,      true                                ], // duration 45 seconds (test fast completion)
    [ACTION_TYPE.CORE_SAMPLE,   'Methane',          'Lot',              4567,   null,               null,   4 * HOUR                                                ], // duration 4 hours
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Lot',              4567,   null,               null,   12 * HOUR                                               ], // duration 12 hours
    [ACTION_TYPE.EXTRACT,       'Methane',          'Extractor',        4567,   'Warehouse',        777,    8 * HOUR                                                ], // duration 8 hours
    [ACTION_TYPE.DECONSTRUCT,   'Extractor',        'Extractor',        89,     'Warehouse',        777,    2 * HOUR                                                ], // duration 2 hours
    [ACTION_TYPE.TRANSFER,      '[multiple]',       'Warehouse',        777,    'Light Transport',  666,    1 * HOUR                                                ], // duration 1 hour
    // Ongoing actions
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Lot',              123,    null,               null,   0,                  true,   ACTION_STATE.ONGOING        ],
    [ACTION_TYPE.EXTRACT,       'Water',            'Extractor',        89,     'Warehouse',        777,    5 * HOUR,           false,  ACTION_STATE.ONGOING        ], // duration 5 hours
    [ACTION_TYPE.CONSTRUCT,     'Marketplace',      'Lot',              1,      null,               null,   23 * HOUR,          false,  ACTION_STATE.ONGOING        ], // duration 23 hours
    [ACTION_TYPE.CONSTRUCT,     'Spaceport',        'Lot',              2,      null,               null,   12 * HOUR,          false,  ACTION_STATE.ONGOING        ], // duration 12 hours
    // Done actions, defined in reverse b/c they are prepended, NOT appended
    [ACTION_TYPE.CONSTRUCT,     'Warehouse',        'Lot',              777,    null,               null,   0,                  false,  ACTION_STATE.DONE,      96  ], // done 4 days ago
    [ACTION_TYPE.TRANSFER,      'Core Samplers',    'Light Transport',  666,    'Warehouse',        777,    0,                  false,  ACTION_STATE.DONE,      72  ], // done 3 days ago
    [ACTION_TYPE.CORE_SAMPLE,   'Water',            'Lot',              89,     null,               null,   0,                  false,  ACTION_STATE.DONE,      48  ], // done 2 days ago
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Lot',              89,     null,               null,   0,                  false,  ACTION_STATE.DONE,      24  ], // done 1 day ago
    [ACTION_TYPE.CORE_SAMPLE,   'Hydrogen',         'Lot',              123,    null,               null,   0,                  false,  ACTION_STATE.DONE,      18  ], // done 18 hours ago
];

function initializeExampleActionsById() {
    exampleActionsTemplate.forEach(actionTemplate => {
        const action = new Action(
            exampleCrew.id,
            exampleCrew.asteroidId,
            actionTemplate[0],
            actionTemplate[1],
            actionTemplate[2],
            actionTemplate[3],
            actionTemplate[4],
            actionTemplate[5],
            actionTemplate[6],
        );
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
    });
}

export {initializeExampleActionsById};
