import calculateRemainBuildTime from './calculateRemainBuildTime.js';
import upgradeBuild from './upgradeBuild.js';

/**
 * Completes a build's upgrade in place if its persisted timer has already
 * expired, instead of waiting for the hourly cron (checkAccumulateTimer.js) to
 * catch up — without this, a player could see a "still building" / blocked
 * collect screen for up to ~59 minutes after the timer actually finished.
 * Mirrors miniapp/builds.js's settleFinishedUpgrades, which already does this
 * on every Mini App read.
 *
 * Mutates `build` in place. Returns true if it just completed (caller is
 * responsible for persisting, e.g. chat.save()).
 */
export default function (build, buildName) {
    if (!build?.upgradeStartedAt) {
        return false;
    }

    let remain;
    try {
        remain = calculateRemainBuildTime(buildName, build);
    } catch (e) {
        return false;
    }

    if (remain > 0) {
        return false;
    }

    upgradeBuild(build, buildName);
    build.upgradeStartedAt = null;
    build.upgradeTimerId = null;
    return true;
}
