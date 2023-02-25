import {createElementFromHtml} from './abstract.js';

class Dropdown {
    constructor(elWrapper, onSelectValue = null, maxRows = 10, hasSearch = false, searchPlaceholder = 'Search') {
        this.elWrapper = elWrapper;
        this.onSelectValue = onSelectValue;
        this.hasSearch = hasSearch;
        this.searchPlaceholder = searchPlaceholder;
        this.elSearchInput = null;
        this.lastSelectedDate = null;
        this.elWrapper.style.setProperty('--max-rows', `${maxRows}`);
        this.selectedValue = null;
        // Inject the list with attached events
        this.elList = document.createElement('ul');
        this.elList.addEventListener('mouseenter', () => {
            this.expandIfNotJustSelected();
        });
        this.elList.addEventListener('click', () => {
            this.expandIfNotJustSelected();
        });
        this.elList.addEventListener('mouseleave', () => {
            this.collapse();
            this.resetSearch();
        });
        this.elWrapper.append(this.elList);
    }

    getSelectedValue() {
        return this.selectedValue;
    }

    collapse() {
        this.elList.classList.remove('hover');
    }

    /**
     * Expand the dropdown, unless an option has just been selected.
     * This avoids an issue where the dropdown remains expanded,
     * immediately after selecting an option.
     */
    expandIfNotJustSelected() {
        if (this.lastSelectedDate) {
            const lastSelectedMsAgo = Date.now() - this.lastSelectedDate.getTime();
            this.lastSelectedDate = null;
            if (lastSelectedMsAgo < 100) {
                return;
            }
        }
        this.elList.classList.add('hover');
        if (this.hasSearch) {
            this.elSearchInput.focus();
        }
    }

    updateOptionsMaxWidth(doSecondPass = true) {
        /**
         * FIRST reset any previously-injected max-width from the CSS,
         * otherwise the max-width keeps increasing, every time this is executed.
         */
        this.elWrapper.style.setProperty('--options-max-width', `0px`);
        // THEN inject the max-width of the widest option element into CSS
        let maxWidth = 0;
        for (const elOption of this.elList.querySelectorAll('li')) {
            maxWidth = Math.max(maxWidth, elOption.getBoundingClientRect().width);
        }
        this.elWrapper.style.setProperty('--options-max-width', `${maxWidth}px`);
        if (doSecondPass) {
            /**
             * Dodgy fix (increase delay if needed) for bug re: max-width too small,
             * if the first option is the selected-and-widest option in the dropdown.
             */
            setTimeout(() => {
                this.updateOptionsMaxWidth(false);
            }, 200);
        }
    }

    /**
     * Expecting "optionsData" as array of objects:
     *  {
     *      iconClass: string, // optional
     *      isOptionGroupLabel: boolean, // optional, true for labels of an option-group
     *      isOptionGroup: boolean, // optional, true for options grouped under an option-group-label
     *      text: string, // optional, defaults to "value"
     *      value: string,
     *  }
     */
    setOptions(optionsData) {
        this.elList.textContent = '';
        if (this.hasSearch) {
            // Inject search-input
            const optionHtml = /*html*/ `
                <li class="option-search">
                    <input type="text" placeholder="${this.searchPlaceholder}">
                </li>
            `;
            const elOption = createElementFromHtml(optionHtml);
            this.elSearchInput = elOption.querySelector('input');
            this.elSearchInput.addEventListener('input', () => this.onChangeSearch());
            this.elSearchInput.addEventListener('keydown', event => this.onKeydownSearch(event));
            this.elList.append(elOption);
        }
        // Inject options
        for (const optionData of Object.values(optionsData)) {
            let iconHtml = '';
            if (optionData.iconClass) {
                iconHtml = /*html*/ `<span class="icon-round ${optionData.iconClass}"></span>`;
            }
            const textHtml = /*html*/ `<span>${optionData.text || optionData.value}</span>`
            const textSecondaryHtml = optionData.textSecondary ? /*html*/ `<div class="secondary">${optionData.textSecondary}</div>` : '';
            const optionHtml = /*html*/ `
                <li>
                    <div>${iconHtml}${textHtml}</div>
                    ${textSecondaryHtml}
                </li>
            `;
            const elOption = createElementFromHtml(optionHtml);
            if (Object.values(optionsData).indexOf(optionData) === 0) {
                // First option => auto-select it
                elOption.classList.add('active');
                this.selectedValue = optionData.value;
            }
            if (optionData.isOptionGroup) {
                elOption.classList.add('option-group');
            }
            if (optionData.isOptionGroupLabel) {
                elOption.classList.add('option-group-label');
            } else {
                elOption.dataset.value = optionData.value;
                elOption.addEventListener('click', () => this.selectOption(elOption));
            }
            this.elList.append(elOption);
        }
        if (Object.keys(optionsData).length === 1) {
            this.elWrapper.classList.add('single-option');
        } else {
            this.elWrapper.classList.remove('single-option');
        }
    }

    onChangeSearch() {
        for (const elOption of this.elList.querySelectorAll('li[data-value]')) {
            /**
             * Search in text, NOT in value, in order to also match e.g. lots based on their asset-name, not just lot ID.
             * This also avoids unexpected results if the text and value have different formats (e.g. "Core Sample" vs. "CORE_SAMPLE").
             */
            if (elOption.textContent.toLowerCase().includes(this.elSearchInput.value.toLowerCase())) {
                elOption.classList.remove('not-matching-search');
            } else {
                elOption.classList.add('not-matching-search');
            }
        }
    }

    onKeydownSearch(event) {
        if (event.key === 'Enter') {
            // Select the first-matching option
            const firstSearchMatch = this.elList.querySelector('li[data-value]:not(.not-matching-search)');
            if (this.elSearchInput.value.length && firstSearchMatch) {
                this.selectOption(firstSearchMatch);
            }
        }
    }

    resetSearch() {
        if (!this.hasSearch) {
            // No search functionality for this dropdown
            return;
        }
        this.elSearchInput.value = '';
        this.elSearchInput.blur();
        // Re-show the options which did not match the previous search
        for (const elOption of this.elList.querySelectorAll('.not-matching-search')) {
            elOption.classList.remove('not-matching-search');
        }
    }

    selectOption(elOptionToSelect) {
        // Default handler
        const elOptionActive = this.elList.querySelector('li.active');
        if (elOptionActive === elOptionToSelect) {
            // Option already selected => do nothing
            return;
        }
        this.selectedValue = elOptionToSelect.dataset.value;
        elOptionActive.classList.remove('active');
        elOptionToSelect.classList.add('active');
        this.lastSelectedDate = new Date();
        this.collapse();
        this.resetSearch();
        // External handler
        if (typeof this.onSelectValue === 'function') {
            this.onSelectValue(elOptionToSelect.dataset.value);
        }
    }

    selectOptionByValue(value) {
        const elOptionToSelect = this.elList.querySelector(`li[data-value="${value}"]`);
        if (!elOptionToSelect) {
            console.log(`%c--- ERROR: option with value "${value}" not found => can NOT select`, 'color: orange;');
            return;
        }
        this.selectOption(elOptionToSelect);
    }

    setDropdownWarning(isWarning) {
        if (isWarning) {
            this.elWrapper.classList.add('warning');
        } else {
            this.elWrapper.classList.remove('warning');
        }
    }
}

export {Dropdown};
