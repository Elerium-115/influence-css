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
 * [
 *      type,
 *      subject,
 *      sourceName,
 *      sourceId,
 *      destinationName,
 *      destinationId,
 *      durationRuntime = 0,
 *      forceReady = false,
 *      forceState = null,
 *      forceStartupFinished = false,
 *      forceFinalizedHoursAgo = null,
 * ]
 */
const exampleActionsTemplate = [
    // Queued actions
    [ACTION_TYPE.EXTRACT,       'Hydrogen',         'Extractor',        123,    'Warehouse',        777,    0.0125 * HOUR, true                                         ], // duration 45 seconds (test fast completion)
    [ACTION_TYPE.CORE_SAMPLE,   'Methane',          'Empty Lot',        4567,   null,               null,   0,                                                          ], // NO runtime duration (only startup duration) for Core Sample
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Empty Lot',        4567,   null,               null,   12 * HOUR,                                                  ],
    [ACTION_TYPE.EXTRACT,       'Methane',          'Extractor',        4567,   'Warehouse',        777,    8 * HOUR,                                                   ],
    [ACTION_TYPE.DECONSTRUCT,   'Extractor',        'Extractor',        89,     'Warehouse',        777,    2 * HOUR,                                                   ],
    [ACTION_TYPE.TRANSFER,      '[multiple]',       'Warehouse',        777,    'Light Transport',  666,    1 * HOUR,                                                   ],
    // Ongoing actions
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Empty Lot',        123,    null,               null,   23 * HOUR,      true,   ACTION_STATE.ONGOING                ],
    [ACTION_TYPE.EXTRACT,       'Water',            'Extractor',        89,     'Warehouse',        777,    5 * HOUR,       false,  ACTION_STATE.ONGOING,   true        ], // startup finished
    [ACTION_TYPE.CONSTRUCT,     'Marketplace',      'Empty Lot',        1,      null,               null,   23 * HOUR,      false,  ACTION_STATE.ONGOING,   true        ], // startup finished
    [ACTION_TYPE.CONSTRUCT,     'Spaceport',        'Empty Lot',        2,      null,               null,   12 * HOUR,      false,  ACTION_STATE.ONGOING,   true        ], // startup finished
    // Done actions, defined in reverse b/c they are prepended, NOT appended
    [ACTION_TYPE.CONSTRUCT,     'Warehouse',        'Empty Lot',        777,    null,               null,   23 * HOUR,      false,  ACTION_STATE.DONE,      false,  96  ], // done 4 days ago
    [ACTION_TYPE.TRANSFER,      'Core Samplers',    'Light Transport',  666,    'Warehouse',        777,    1 * HOUR,       false,  ACTION_STATE.DONE,      false,  72  ], // done 3 days ago
    [ACTION_TYPE.CORE_SAMPLE,   'Water',            'Empty Lot',        89,     null,               null,   0,              false,  ACTION_STATE.DONE,      false,  48  ], // done 2 days ago, NO runtime duration (only startup duration) for Core Sample
    [ACTION_TYPE.CONSTRUCT,     'Extractor',        'Empty Lot',        89,     null,               null,   23 * HOUR,      false,  ACTION_STATE.DONE,      false,  24  ], // done 1 day ago
    [ACTION_TYPE.CORE_SAMPLE,   'Hydrogen',         'Empty Lot',        123,    null,               null,   0,              false,  ACTION_STATE.DONE,      false,  18  ], // done 18 hours ago, NO runtime duration (only startup duration) for Core Sample
];

function initializeExampleActionsById() {
    exampleActionsTemplate.forEach(actionTemplate => {
        const action = new Action(
            exampleCrew.id,         // crewId
            exampleCrew.asteroidId, // asteroidId
            actionTemplate[0],      // type
            actionTemplate[1],      // subject
            actionTemplate[2],      // sourceName
            actionTemplate[3],      // sourceId
            actionTemplate[4],      // destinationName
            actionTemplate[5],      // destinationId
            actionTemplate[6],      // durationRuntime
        );
        if (actionTemplate[7]) {    // forceReady
            action.markReady();
        }
        if (actionTemplate[8]) {    // forceState
            action.setState(actionTemplate[8]);
        }
        if (actionTemplate[9]) {    // forceStartupFinished
            action.forceStartupFinished();
        }
        if (actionTemplate[10]) {   // forceFinalizedHoursAgo
            action.finalizedDate.setHours(action.finalizedDate.getHours() - actionTemplate[10]);
        }
        action.injectListItem();
    });
}

export {initializeExampleActionsById};
