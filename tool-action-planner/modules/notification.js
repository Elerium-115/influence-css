import {deleteFromDOM} from './abstract.js';

class NotificationService {
    constructor() {}

    static createNotification(notificationHtml, isWarning = false) {
        const warningClass = isWarning ? 'warning' : '';
        const notificationWrapperHtml = /*html*/ `
            <div class="notification-wrapper">
                <div class="notification ${warningClass}">
                    <div class="notification-close" onclick="onCloseNotification(this)"></div>
                    <div>${notificationHtml}</div>
                </div>
            </div>
        `;
        document.getElementById('notifications').innerHTML += notificationWrapperHtml;
    }
}

// Global variables and functions

globalThis.onCloseNotification = function(el) {
    const closingDuration = 600;
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
