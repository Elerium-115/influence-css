import {deleteFromDOM} from './abstract.js';

class NotificationService {
    constructor() {}

    static createNotification(messageHtml, isWarning = false) {
        const warningClass = isWarning ? 'warning' : '';
        const elNotificationWrapper = document.createElement('div');
        elNotificationWrapper.classList.add('notification-wrapper');
        elNotificationWrapper.innerHTML = /*html*/ `
            <div class="notification ${warningClass}">
                <div class="notification-close" onclick="onCloseNotification(this)"></div>
                <div>${messageHtml}</div>
            </div>
        `;
        document.getElementById('notifications').appendChild(elNotificationWrapper);
    }
}

// Global variables and functions

globalThis.onCloseNotification = function(el) {
    const closingDuration = 300;
    const elNotificationWrapper = el.closest('.notification-wrapper');
    // Set initial height, to be animated via "closing" class
    elNotificationWrapper.style.setProperty('height', `${elNotificationWrapper.getBoundingClientRect().height}px`);
    elNotificationWrapper.style.setProperty('--close-duration', `${closingDuration}ms`);
    elNotificationWrapper.classList.add('closing');
    setTimeout(() => {
        deleteFromDOM(elNotificationWrapper);
    }, closingDuration);
}

export {NotificationService};
