import test from 'node:test';
import assert from 'node:assert/strict';
import Chat from '../db/models/Chat.js';
import fillDefaults from '../functions/getters/getLostFieldsInSession.js';

test('loading a stored member keeps the chosen horoscope sign and news setting', () => {
  const chat = new Chat({chatId: 1, members: [{userId: 1, horoscope: {sign: 'virgo', style: 'sweet'}, whatsNewSettings: {flag: 1, button: {text: 'Вкл', callback_data: 'whatsNew.1'}}}]});
  const member = chat.members[0];
  fillDefaults(member);
  assert.deepEqual({...member.horoscope}, {sign: 'virgo', style: 'sweet'});
  assert.equal(member.whatsNewSettings.flag, 1);
});

test('a member without settings gets the defaults', () => {
  const member = new Chat({chatId: 2, members: [{userId: 2}]}).members[0];
  fillDefaults(member);
  assert.equal(member.horoscope.sign, 'aries');
  assert.equal(member.whatsNewSettings.flag, 0);
});

test('the chosen sign and style survive a reload and reach the generator', async () => {
  const {updateHoroscopeSettings, generateHoroscopeForMiniApp} = await import('../miniapp/horoscope.js');
  const member = new Chat({chatId: 3, members: [{userId: 3}]}).members[0];
  fillDefaults(member);
  updateHoroscopeSettings(member, {sign: 'virgo'});
  updateHoroscopeSettings(member, {style: 'sarcastic'});
  fillDefaults(member); // the next request loads the stored member again
  let seen = null;
  const result = await generateHoroscopeForMiniApp(member, {generate: async session => { seen = {...session.horoscope}; return 'ok'; }});
  assert.equal(seen.sign, 'virgo');
  assert.equal(seen.style, 'sarcastic');
  assert.equal(result.horoscope.sign.code, 'virgo');
  assert.equal(result.horoscope.style.key, 'sarcastic');
});

test('a generated line gets exactly one sign prefix whatever icon the model used', async () => {
  const {withSignPrefix, getSignByCode} = await import('../functions/game/horoscope/horoscope.js');
  const libra = getSignByCode('libra');
  for (const line of ['⚖️ Весы: Снова пицца.', '♎ Весы: Снова пицца.', 'Весы: Снова пицца.', 'Снова пицца.']) {
    assert.equal(withSignPrefix(line, libra), '♎ Весы: Снова пицца.', line);
  }
});
