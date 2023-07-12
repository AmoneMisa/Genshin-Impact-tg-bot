const buildsTemplate = require( "../../../templates/buildsTemplate");

module.exports = function () {
  let result = {};

  for (let [key, build] of Object.entries(buildsTemplate)) {
    if (!build.available) {
      continue;
    }

    if (build.startLvl === 0) {
      continue;
    }

    result[key] = {currentLvl: build.startLvl, upgradeStartedAt: null, lastCollectAt: null};

    if (build.hasOwnProperty('resourcesType')) {
      result[key].resourceCollected = 0;
    }

    if (build.hasOwnProperty('availableTypes')) {
      result[key].type = "common";
    }
  }

    return result;
};