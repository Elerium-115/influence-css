class Asteroid {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.lots = []; // array of "Lot"
        asteroidService.asteroidsById[id] = this;
    }
}

class AsteroidService {
    constructor() {
        this.asteroidsById = {};
    }
}

// Global variables and functions

globalThis.asteroidService = new AsteroidService();

export {Asteroid};
