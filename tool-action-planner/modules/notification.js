import {deleteFromDOM} from './abstract.js';

class NotificationService {
    constructor() {
        this.elConfirmationWrapper = document.getElementById('confirmation-wrapper');
        this.elConfirmationMessage = document.getElementById('confirmation-message');
        this.acceptConfirmationCallback = null;
    }

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

    /**
     * @param {string} messageHtml The message HTML should start with an `<h2>` asking which action to accept
     * @param {function} callback Method to execute if the confirmation is accepted
     */
    createConfirmation(messageHtml, callback) {
        // Pressing "Escape" while the confirmation exists, closes the confirmation
        globalThis.onKeyEscape = onDeclineConfirmation;
        this.acceptConfirmationCallback = callback;
        this.elConfirmationMessage.innerHTML = messageHtml;
        this.elConfirmationWrapper.classList.remove('hidden');
        setTimeout(() => {
            this.elConfirmationWrapper.classList.add('opened');
        }, 10); // small delay required, for the CSS transition to kick in
    }

    closeConfirmation(accepted = false) {
        this.elConfirmationWrapper.classList.add('closing');
        setTimeout(() => {
            globalThis.onKeyEscape = null;
            this.elConfirmationWrapper.classList.add('hidden');
            this.elConfirmationWrapper.classList.remove('opened', 'closing');
            this.elConfirmationMessage.textContent = '';
            if (accepted && typeof this.acceptConfirmationCallback === 'function') {
                this.acceptConfirmationCallback();
                this.acceptConfirmationCallback = null;
            }
        }, 300);
    }
}

// Global variables and functions

globalThis.notificationService = new NotificationService();

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

globalThis.onDeclineConfirmation = function() {
    notificationService.closeConfirmation();
}

globalThis.onAcceptConfirmation = function() {
    notificationService.closeConfirmation(true);
}

export {NotificationService};
