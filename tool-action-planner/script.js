import {Action, ACTION_STATE, ACTION_TYPE} from './modules/action.js';

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

// Preload example actions
window.exampleActions = []; // Expose this globally
let tempAction = null
let tempListItemsHtml = '';
// -- Queued actions
tempListItemsHtml = '';
// ---- Extract: Hydrogen
tempAction = new Action(ACTION_TYPE.EXTRACT, 'Hydrogen', 'Extractor', 123, 'Warehouse', 777);
tempAction.markReady();
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Core Sample: Methane
tempAction = new Action(ACTION_TYPE.CORE_SAMPLE, 'Methane', 'Lot', 4567, null, null);
tempAction.markReady();
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Construct: Extractor
tempAction = new Action(ACTION_TYPE.CONSTRUCT, 'Extractor', 'Lot', 4567, null, null);
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Extract: Methane
tempAction = new Action(ACTION_TYPE.EXTRACT, 'Methane', 'Extractor', 4567, 'Warehouse', 777);
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Deconstruct: Extractor
tempAction = new Action(ACTION_TYPE.DECONSTRUCT, 'Extractor', 'Lot', 89, 'Warehouse', 777);
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Transfer: [multiple]
tempAction = new Action(ACTION_TYPE.TRANSFER, '[multiple]', 'Warehouse', 777, 'Light Transport', 666);
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Inject HTML
document.getElementById('actions-queued').querySelector('ul').innerHTML += tempListItemsHtml;
// ---- Adjust HTML
const queuedNotReadyListItems = [...document.getElementById('actions-queued').querySelectorAll('li:not(.ready)')];
if (queuedNotReadyListItems.length) {
    // Do not show arrow-up for top [queued + NOT ready] action
    queuedNotReadyListItems[0].querySelector('.icon-arrow-up').style.display = 'none';
    // Do not show arrow-down for bottom [queued + NOT ready] action
    queuedNotReadyListItems[queuedNotReadyListItems.length - 1].querySelector('.icon-arrow-down').style.display = 'none';
}
// -- Ongoing actions
tempListItemsHtml = '';
// ---- Construct: Extractor
tempAction = new Action(ACTION_TYPE.CONSTRUCT, 'Extractor', 'Lot', 123, null, null);
tempAction.markReady();
tempAction.setState(ACTION_STATE.ONGOING);
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Extract: Water
tempAction = new Action(ACTION_TYPE.EXTRACT, 'Water', 'Extractor', 89, 'Warehouse', 777);
tempAction.setState(ACTION_STATE.ONGOING);
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Inject HTML
document.getElementById('actions-ongoing').querySelector('ul').innerHTML += tempListItemsHtml;
// -- Done actions
tempListItemsHtml = '';
// ---- Core Sample: Methane
tempAction = new Action(ACTION_TYPE.CORE_SAMPLE, 'Hydrogen', 'Lot', 123, null, null);
tempAction.setState(ACTION_STATE.DONE);
tempAction.markFinalized();
tempAction.finalizedDate.setHours(tempAction.finalizedDate.getHours() - 18); // 18 hours ago
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Construct: Extractor
tempAction = new Action(ACTION_TYPE.CONSTRUCT, 'Extractor', 'Lot', 89, null, null);
tempAction.setState(ACTION_STATE.DONE);
tempAction.markFinalized();
tempAction.finalizedDate.setHours(tempAction.finalizedDate.getHours() - 24); // 1 day ago
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Core Sample: Water
tempAction = new Action(ACTION_TYPE.CORE_SAMPLE, 'Water', 'Lot', 89, null, null);
tempAction.setState(ACTION_STATE.DONE);
tempAction.markFinalized();
tempAction.finalizedDate.setHours(tempAction.finalizedDate.getHours() - 48); // 2 days ago
exampleActions.push(tempAction);
tempListItemsHtml += tempAction.getListItemHtml();
// ---- Inject HTML
document.getElementById('actions-done').querySelector('ul').innerHTML += tempListItemsHtml;
