const calculateIncreaseInResourceExtraction = require('./calculateIncreaseInResourceExtraction');
const sendMessageWithDelete = require("../../tgBotFunctions/sendMessageWithDelete");

module.exports = function (build, maxWorkHoursWithoutCollection, resourcesPerHour) {
    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, "Вы не можете собирать ресурсы со здания, которое в данный момент улучшается", {}, 5000);
    }

  if (build.currentLvl === 1) {
      return build.accumulatedTimer = setInterval(() => {
         build.resourceCollected += resourcesPerHour;
      }, 60 * 60);
  }

    build.accumulatedTimer = setInterval(() => {
        build.resourceCollected += resourcesPerHour * calculateIncreaseInResourceExtraction(build, build.currentLvl);
    }, 60 * 60);
};