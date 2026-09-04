from pathlib import Path

path = Path('callbacks/game/player/showInventory.js')
text = path.read_text()

broken = 'async function sendHealMessage}]];\n\nasync function sendHealMessage'
if broken not in text:
    raise RuntimeError('Expected duplicated sendHealMessage boundary was not generated')

path.write_text(text.replace(broken, 'async function sendHealMessage', 1))
