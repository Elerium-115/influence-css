import {createElementFromHtml} from './abstract.js';

class Dropdown {
    constructor(elWrapper, onSelectValue = null, maxRows = 10) {
        this.elWrapper = elWrapper;
        this.onSelectValue = onSelectValue;
        this.elWrapper.style.setProperty('--max-rows', `${maxRows}`);
        this.selectedValue = null;
        // Inject the list with attached events
        this.elList = document.createElement('ul');
        this.elList.addEventListener('mouseenter', () => {
            this.elList.classList.add('hover');
        });
        this.elList.addEventListener('mouseleave', () => {
            this.elList.classList.remove('hover');
        });
        this.elWrapper.append(this.elList);
    }

    getSelectedVaue() {
        return this.selectedValue;
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
        for (const optionData of Object.values(optionsData)) {
            let iconHtml = '';
            if (optionData.iconClass) {
                iconHtml = /*html*/ `<span class="icon-round ${optionData.iconClass}"></span>`;
            }
            const optionHtml = /*html*/ `<li>${iconHtml}${optionData.text || optionData.value}</li>`;
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
        if (elOptionToSelect !== this.elList.firstElementChild) {
            // Non-first option selected
            this.shrinkDropdown();
        }
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

    /**
     * Briefly limit the height of the dropdown, in order to shrink it.
     * NOTE: This only works if the cursor is over a non-first option.
     */
    shrinkDropdown() {
        this.elList.classList.add('shrink');
        setTimeout(() => {
            this.elList.classList.remove('shrink');
        }, 100);
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
