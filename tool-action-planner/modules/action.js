class Action {
    constructor(type) {
        this.id = new Date().getTime(); //// PLACEHOLDER
        this.state = ACTION_STATE.QUEUED; // default state for new actions
        this.type = type; // expecting "ACTION_TYPE" value
    }
}

const ACTION_STATE = {
    DONE: 'DONE',
    ONGOING: 'ONGOING',
    QUEUED: 'QUEUED',
    TRANSITIONING: 'TRANSITIONING',
};

const ACTION_TYPE = {
    CONSTRUCT: 'CONSTRUCT',
    CORE_SAMPLE: 'CORE_SAMPLE',
    DECONSTRUCT: 'DECONSTRUCT',
    EXTRACT: 'EXTRACT',
    TRANSFER: 'TRANSFER',
};

export {Action};
