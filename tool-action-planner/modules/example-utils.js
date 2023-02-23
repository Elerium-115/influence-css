import {HOUR} from './abstract.js';
import {Action, ACTION_STATE, ACTION_TYPE} from './action.js';
import {Crew} from './crew.js';
import {Asteroid} from './asteroid.js';
import {LOT_ASSET, LOT_ASSET_DATA} from './lot.js';

// Example asteroids
new Asteroid(1, 'Adalia Prime', 1768484);
new Asteroid(296, 'Tortuga', 7940);

// Example crew
const exampleCrew = new Crew('Dragon');
// exampleCrew.setAsteroidId(1); // Adalia Prime
exampleCrew.setAsteroidId(296); // Tortuga
exampleCrew.setIsLanded(true);
exampleCrew.setBase(666, LOT_ASSET_DATA['Light Transport'].NAME); // Light Transport at lot #666
// exampleCrew.setIsLanded(false); //// TEST

// Example lots on asteroid #1 for example crew
for (const lotId of [666, 777, 89, 123, 1, 2, 4567]) {
    // exampleCrew.initializeLot(1, lotId); // initialize lot on Adalia Prime
    exampleCrew.initializeLot(296, lotId); // initialize lot on Tortuga
}

/**
 * Example action template:
 * [
 *      type,
 *      subject,
 *      source, // or "sourceName" if hardcoded string
 *      sourceId,
 *      destination, // or "destinationName" if hardcoded string
 *      destinationId,
 *      durationRuntime = 0,
 *      forceReady = false,
 *      forceState = null,
 *      forceStartupFinished = false,
 *      forceFinalizedHoursAgo = null,
 * ]
 * 
 * NOTE: Parse example actions in their chronological order:
 * 1. oldest-done
 * 2. ongoing (order irrelevant re: only 1 ongoing action per lot)
 * 3. latest-queued
 */
const exampleActionsTemplate = [
    // Done actions, defined in reverse b/c they are prepended, NOT appended
    [ACTION_TYPE.LAND,          LOT_ASSET['Light Transport'],   'Empty Lot',                    666,    null,                           null,   0,              false,  ACTION_STATE.DONE,      false,  120 ], // done 5 days ago
    [ACTION_TYPE.CONSTRUCT,     LOT_ASSET['Warehouse'],         'Empty Lot',                    777,    null,                           null,   23 * HOUR,      false,  ACTION_STATE.DONE,      false,  96  ], // done 4 days ago
    [ACTION_TYPE.TRANSFER,      'Core Samplers',                LOT_ASSET['Light Transport'],   666,    LOT_ASSET['Warehouse'],         777,    1 * HOUR,       false,  ACTION_STATE.DONE,      false,  72  ], // done 3 days ago
    [ACTION_TYPE.CORE_SAMPLE,   'Water',                        'Empty Lot',                    89,     null,                           null,   0,              false,  ACTION_STATE.DONE,      false,  48  ], // done 2 days ago, NO runtime duration (only startup duration) for Core Sample
    [ACTION_TYPE.CONSTRUCT,     LOT_ASSET['Extractor'],         'Empty Lot',                    89,     null,                           null,   23 * HOUR,      false,  ACTION_STATE.DONE,      false,  24  ], // done 1 day ago
    [ACTION_TYPE.CORE_SAMPLE,   'Hydrogen',                     'Empty Lot',                    123,    null,                           null,   0,              false,  ACTION_STATE.DONE,      false,  18  ], // done 18 hours ago, NO runtime duration (only startup duration) for Core Sample

    // Ongoing actions
    [ACTION_TYPE.CONSTRUCT,     LOT_ASSET['Extractor'],         'Empty Lot',                    123,    null,                           null,   23 * HOUR,      true,   ACTION_STATE.ONGOING                ],
    [ACTION_TYPE.EXTRACT,       'Water',                        LOT_ASSET['Extractor'],         89,     LOT_ASSET['Warehouse'],         777,    0.0125 * HOUR,  false,  ACTION_STATE.ONGOING,   true        ], // startup finished
    [ACTION_TYPE.CONSTRUCT,     LOT_ASSET['Marketplace'],       'Empty Lot',                    1,      null,                           null,   23 * HOUR,      false,  ACTION_STATE.ONGOING,   true        ], // startup finished
    [ACTION_TYPE.CONSTRUCT,     LOT_ASSET['Spaceport'],         'Empty Lot',                    2,      null,                           null,   12 * HOUR,      false,  ACTION_STATE.ONGOING,   true        ], // startup finished

    // Queued actions
    [ACTION_TYPE.EXTRACT,       'Hydrogen',                     LOT_ASSET['Extractor'],         123,    LOT_ASSET['Warehouse'],         777,    0.0125 * HOUR,                                              ], // duration 45 seconds (test fast completion)
    [ACTION_TYPE.CONSTRUCT,     LOT_ASSET['Extractor'],         'Empty Lot',                    4567,   null,                           null,   0.0025 * HOUR,                                              ],
    [ACTION_TYPE.CORE_SAMPLE,   'Methane',                      'Empty Lot',                    4567,   null,                           null,   0,                                                          ], // NO runtime duration (only startup duration) for Core Sample
    [ACTION_TYPE.EXTRACT,       'Methane',                      LOT_ASSET['Extractor'],         4567,   LOT_ASSET['Warehouse'],         777,    8 * HOUR,                                                   ],
    [ACTION_TYPE.DECONSTRUCT,   LOT_ASSET['Extractor'],         LOT_ASSET['Extractor'],         89,     LOT_ASSET['Warehouse'],         777,    0.0125 * HOUR,                                              ],
    [ACTION_TYPE.TRANSFER,      '[multiple]',                   LOT_ASSET['Warehouse'],         777,    LOT_ASSET['Light Transport'],   666,    0.0025 * HOUR,                                              ],
];

function initializeExampleActionsById() {
    exampleActionsTemplate.forEach(actionTemplate => {
        const action = new Action(
            exampleCrew.id,         // crewId
            exampleCrew.asteroidId, // asteroidId
            actionTemplate[0],      // type
            actionTemplate[1],      // subject
            actionTemplate[2],      // source
            actionTemplate[3],      // sourceId
            actionTemplate[4],      // destination
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
