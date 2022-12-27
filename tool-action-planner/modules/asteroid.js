class Asteroid {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        // this.lots = []; // array of "Lot" //// TEST
        asteroidsById[id] = this;
    }
}

// Global variables and functions

globalThis.asteroidsById = {};

export {Asteroid};
