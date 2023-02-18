class Asteroid {
    constructor(id, name, maxLots) {
        this.id = id;
        this.name = name;
        this.maxLots = maxLots; // i.e. area in km2
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
