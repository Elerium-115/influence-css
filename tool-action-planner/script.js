import {initializeExampleActionsById} from './modules/example-utils.js';

/**
 * Fix for Firefox bug re: checkbox inputs keeping
 * the "checked" PROPERTY cached after a SOFT-reload.
 * e.g. if deselecting an input, and then doing a soft-reload,
 * the input will keep its "checked" property = false,
 * even though the DOM elements are marked as checked.
 */
document.querySelectorAll('label > input').forEach(elInput => {
    elInput.checked = elInput.parentElement.classList.contains('checked');
});

/**
 * Get asteroid ID injected from iframe parent, if any
 * e.g. game URL: https://game.influenceth.io/asteroids/1234
 * => iframe URL: .../tool.html?influence_asteroid=1234
 */
const urlParams = new URLSearchParams(location.search);
const influenceAsteroidId = urlParams.get('influence_asteroid');

// Global variables and functions

globalThis.closeConfigPanels = function() {
    for (const elConfigPanel of document.querySelectorAll('.config-panel')) {
        elConfigPanel.classList.add('hidden');
    }
    for (const elButton of document.querySelectorAll('.primary-buttons button')) {
        elButton.classList.remove('active');
    }
}

// Source: https://gist.github.com/Machy8/1b0e3cd6c61f140a6b520269acdd645f
function on(eventType, selector, callback) {
    document.addEventListener(eventType, event => {
        if (event.target.matches === undefined) {
            // Avoid errors in Brave
            return;
        }
        if (event.target.matches(selector)) {
            callback(event.target);
        }
    }, true); // "true" required for correct behaviour of e.g. "mouseenter" / "mouseleave" attached to elements that have children
}

// Toggle option checked
on('change', 'label > input', el => {
    if (el.checked) {
        el.parentElement.classList.add('checked');
    } else {
        el.parentElement.classList.remove('checked');
    }
});

// Toggle compact vs. expanded layout for each "ul.list-expanding-items"
on('change', '#toggle-compact-lists', el => {
    const elsActionGroupList = document.querySelectorAll("ul.list-expanding-items");
    if (el.checked) {
        elsActionGroupList.forEach(el => el.classList.remove('list-expanded'));
    } else {
        elsActionGroupList.forEach(el => el.classList.add('list-expanded'));
    }
});

// Toggle showing vs. hiding ".action-type-text" elements in each "ul.list-expanding-items"
on('change', '#toggle-action-types', el => {
    const elsActionGroupList = document.querySelectorAll("ul.list-expanding-items");
    if (el.checked) {
        elsActionGroupList.forEach(el => el.classList.remove('hide-action-types'));
    } else {
        elsActionGroupList.forEach(el => el.classList.add('hide-action-types'));
    }
});

// Initialize example actions
initializeExampleActionsById();
actionService.updateQueuedDraggables();

//// TEST
// document.getElementById('plan-actions').classList.add('hidden'); // hide "Plan Actions"
// document.getElementById('toggle-action-types-label').click(); // hide action types
// document.getElementById('toggle-compact-lists-label').click(); // show expanded lists
