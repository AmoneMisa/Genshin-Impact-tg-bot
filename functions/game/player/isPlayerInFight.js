export default function (session) {
    return session.game.stats.inFightTimer > new Date().getTime();
}