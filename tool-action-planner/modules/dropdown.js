import {createElementFromHtml} from './abstract.js';

class Dropdown {
    constructor(elWrapper, onSelectValue = null) {
        this.elWrapper = elWrapper;
        this.onSelectValue = onSelectValue;
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

    /**
     * Expecting "optionsData" as array of objects:
     *  {
     *      iconClass: string, // optional
     *      text: string, // optional, defaults to "value"
     *      value: string,
     *  }
     */
    setOptions(optionsData) {
        for (const optionData of Object.values(optionsData)) {
            let activeClass = '';
            if (Object.values(optionsData).indexOf(optionData) === 0) {
                // First option
                activeClass = 'active';
                this.selectedValue = optionData.value;
            }
            let iconHtml = '';
            if (optionData.iconClass) {
                iconHtml = /*html*/ `<span class="icon-round ${optionData.iconClass}"></span>`;
            }
            const optionHtml = /*html*/ `
                <li class="${activeClass}" data-value="${optionData.value}">
                    ${iconHtml}${optionData.text || optionData.value}
                </li>
            `;
            const elOption = createElementFromHtml(optionHtml);
            elOption.addEventListener('click', () => this.selectOption(elOption));
            this.elList.append(elOption);
        }
    }

    selectOption(elOption) {
        // Default handler
        const activeOption = this.elList.querySelector('li.active');
        if (activeOption === elOption) {
            // Option already selected => do nothing
            return;
        }
        this.selectedValue = elOption.dataset.value;
        activeOption.classList.remove('active');
        elOption.classList.add('active');
        if (elOption !== this.elList.firstElementChild) {
            // Non-first option selected
            this.shrinkDropdown();
        }
        // External handler
        if (this.onSelectValue) {
            this.onSelectValue(elOption.dataset.value);
        }
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
}

export {Dropdown};
