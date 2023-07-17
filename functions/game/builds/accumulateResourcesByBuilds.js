const calculateIncreaseInResourceExtraction = require('./calculateIncreaseInResourceExtraction');
const sendMessageWithDelete = require("../../tgBotFunctions/sendMessageWithDelete");

module.exports = function (build, maxWorkHoursWithoutCollection, resourcesPerHour, chatId) {
    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, "Вы не можете собирать ресурсы со здания, которое в данный момент улучшается", {}, 5000);
    }

  if (build.currentLvl === 1) {
      return build.accumulatedTimer = setInterval(() => {
         build.resourceCollected += Math.ceil(resourcesPerHour);
      }, 60 * 60 * 1000);
  }

    build.accumulatedTimer = setInterval(() => {
        build.resourceCollected += Math.ceil(resourcesPerHour * calculateIncreaseInResourceExtraction(build, build.currentLvl));
    }, 60 * 60 * 1000);
};