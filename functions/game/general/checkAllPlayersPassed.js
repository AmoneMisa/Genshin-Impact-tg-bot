export default function areAllPlayersPassed(chatSession, gameName) {
    const game = chatSession?.game?.[gameName];
    if (!game?.players) return false;

    return Object.entries(game.players).every(
        ([playerId, player]) => playerId === "bot" || player.isPass
    );
}
