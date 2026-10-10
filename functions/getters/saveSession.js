export default async function saveSession(session) {
    const chat = session?.ownerDocument?.() || session?.parent?.();
    if (!chat?.save) {
        throw new Error('Cannot persist player session without its parent Chat document');
    }

    const index = chat.members.findIndex(member => member === session || String(member.userId) === String(session.userId));
    if (index < 0) {
        throw new Error(`Player ${session?.userId ?? 'unknown'} is missing from its parent Chat document`);
    }

    // `game` and several legacy feature fields are intentionally Mixed while
    // the old JSON model is being migrated. Mark the whole member dirty so
    // nested mutations are never lost by Mongoose change tracking.
    chat.markModified(`members.${index}`);
    // Other members changed in the same action (party buffs, ...) flag themselves with `needsSave`.
    chat.members.forEach((member, memberIndex) => {
        if (member?.needsSave && memberIndex !== index) chat.markModified(`members.${memberIndex}`);
        if (member?.needsSave) member.needsSave = false;
    });
    await chat.save();
    return session;
}
