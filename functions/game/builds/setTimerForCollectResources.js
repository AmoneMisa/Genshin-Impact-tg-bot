module.exports = function (build, maxWorkHoursWithoutCollection, defaultCollectedPerHour) {
    let timer = setInterval(() => {
        if (Date.now() - build.lastCollectedAt > maxWorkHoursWithoutCollection * 3600000) {
            clearInterval(timer);
            build.isCollectedResources = false;
        } else if (Date.now() - build.lastCollectedAt > 0) {
            build.isCollectedResources = true;
            build.lastCollectedAt = Date.now();
            clearInterval(timer);
        }
    }, 1000);

    return timer;
}