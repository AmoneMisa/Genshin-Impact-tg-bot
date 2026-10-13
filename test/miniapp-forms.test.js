import test from 'node:test';
import assert from 'node:assert/strict';
import { getFormFieldLimit, getFormsState, savePersonalForm } from '../miniapp/forms.js';
import {projectTextHtml} from '../webapp/forms.js';

function chat() {
  return {
    members: [
      {
        userId: 10,
        isHided: false,
        userChatData: { user: { id: 10, username: 'current', first_name: 'Current' } },
        user: { nickName: 'Traveler', name: 'Legacy Name', rank: '60' },
      },
      {
        userId: 11,
        isHided: false,
        userChatData: { user: { id: 11, first_name: 'Visible' } },
        user: { favoriteElement: 'Крио', favoriteGames: 'Lineage II' },
      },
      {
        userId: 12,
        isHided: true,
        userChatData: { user: { id: 12, first_name: 'Hidden' } },
        user: { rank: '58' },
      },
      {
        userId: 13,
        isHided: false,
        userChatData: { user: { id: 13, first_name: 'Bot', is_bot: true } },
        user: { rank: '1' },
      },
      {
        userId: 14,
        isHided: false,
        userChatData: { status: 'left', user: { id: 14, first_name: 'Left' } },
        user: { rank: '55' },
      },
      {
        userId: 15,
        isHided: false,
        userChatData: { status: 'kicked', user: { id: 15, first_name: 'Kicked' } },
        user: { rank: '56' },
      },
    ],
  };
}

test('forms state exposes human interests and keeps legacy game data out of the public form', () => {
  const state = getFormsState(chat(), 10);

  assert.equal(state.fields.find(field => field.key === 'nickName').value, 'Traveler');
  assert.equal(state.fields.some(field => field.key === 'rank'), false);
  assert.equal(state.fields.some(field => field.key === 'occupation'), true);
  assert.equal(state.fields.some(field => field.key === 'name'), true);
  assert.deepEqual(state.profiles.map(profile => profile.userId), ['10', '11']);
  assert.equal(state.profiles[0].name, '@current');
  assert.equal(state.profiles[0].isCurrent, true);
  assert.equal(state.profiles[0].fields.some(field => field.key === 'name' && field.value === 'Legacy Name'), true);
  assert.equal(state.profiles[1].fields[0].value, 'Lineage II');
});

test('form save trims values, clears blanks and preserves non-editable legacy data', () => {
  const data = chat();
  const result = savePersonalForm(data, 10, {
    nickName: '  Lumine  ',
    occupation: '',
    favoriteGames: 'Lineage II',
  });

  assert.equal(result.ok, true);
  assert.equal(data.members[0].user.nickName, 'Lumine');
  assert.equal(data.members[0].user.rank, '60');
  assert.equal(data.members[0].user.occupation, null);
  assert.equal(data.members[0].user.favoriteGames, 'Lineage II');
  assert.equal(data.members[0].user.name, 'Legacy Name');
  assert.equal(result.forms.fields.find(field => field.key === 'favoriteGames').value, 'Lineage II');
});

test('form save rejects unknown fields and oversized values without partial mutation', () => {
  const data = chat();
  const before = structuredClone(data.members[0].user);

  const unknown = savePersonalForm(data, 10, { admin: 'yes' });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'invalid_field');
  assert.deepEqual(data.members[0].user, before);

  const tooLong = savePersonalForm(data, 10, { occupation: 'x'.repeat(getFormFieldLimit() + 1) });
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.reason, 'value_too_long');
  assert.deepEqual(data.members[0].user, before);
});

test('form save rejects missing members and non-string values', () => {
  assert.equal(savePersonalForm(chat(), 999, { occupation: '60' }).reason, 'member_not_found');
  assert.equal(savePersonalForm(chat(), 10, { occupation: 60 }).reason, 'invalid_value');
  assert.equal(savePersonalForm(chat(), 10, null).reason, 'invalid_fields');
});

test('projects support descriptions and links within their own atomic length limit',()=>{
 const data=chat(),text='Игра — https://example.com — делаю игру\nБлог — https://example.org — пишу о книгах';
 assert.equal(savePersonalForm(data,10,{personalProjects:text}).ok,true);
 assert.equal(getFormsState(data,10).fields.find(f=>f.key==='personalProjects').value,text);
 const before={...data.members[0].user};
 assert.equal(savePersonalForm(data,10,{occupation:'changed',personalProjects:'x'.repeat(1501)}).reason,'value_too_long');
 assert.deepEqual(data.members[0].user,before);
});

test('project links escape markup and only make HTTP links clickable',()=>{
 const html=projectTextHtml('<img src=x onerror=bad()> https://example.com/?a=1&b=2 javascript:alert(1)');
 assert.equal(html.includes('<img'),false);assert.ok(html.includes('&lt;img'));
 assert.ok(html.includes('rel="noopener noreferrer"'));assert.ok(html.includes('href="https://example.com/?a=1&amp;b=2"'));
 assert.equal((html.match(/<a /g)||[]).length,1);
 assert.equal(projectTextHtml('https://user:password@example.com').includes('<a '),false);
});
