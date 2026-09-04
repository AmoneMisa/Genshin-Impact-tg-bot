from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# Expose competition state in the clan dashboard.
path = Path("miniapp/clan.js")
text = path.read_text()
anchor = "import { getClanActivitiesState } from './clanActivities.js';\n"
text = replace_once(text, anchor, anchor + "import { getClanCompetitionState } from './clanCompetition.js';\n", "clan competition import")
anchor = "      activities: await getClanActivitiesState(clan, userId, playerSession),\n"
text = replace_once(text, anchor, anchor + "      competition: await getClanCompetitionState(clan, playerSession, userId),\n", "clan competition state")
anchor = "    activities: null,\n"
text = replace_once(text, anchor, anchor + "    competition: null,\n", "empty clan competition state")
path.write_text(text)


# Route competition actions through the same global clan lock.
path = Path("miniapp/server.js")
text = path.read_text()
anchor = "import { prepareClanActivity } from './clanActivities.js';\n"
text = replace_once(text, anchor, anchor + "import { performClanCompetitionAction } from './clanCompetition.js';\n", "server competition import")
old = """    const allowed = new Set(['boss_summon', 'boss_attack', 'shop_buy', 'upgrade_member', 'upgrade_building']);
    if (!allowed.has(body.action)) {
      const error = new Error('Unknown clan activity');
      error.status = 400;
      throw error;
    }

    const payload = await withLock('clan:global', async () => {
      context.session = await getSession(context.chatId, context.userId);
      const prepared = await prepareClanActivity(context.userId, context.session, body.action, body);
      const result = prepared.result;

      if (result.ok) {
        if (prepared.savePlayer) await saveSession(context.session);
        if (prepared.clan) await prepared.clan.save();
      }

      const dashboard = await getClanDashboard(context.userId, context.session);
      return { result, dashboard };
    });
"""
new = """    const competitionActions = new Set(['pvp_fight', 'war_declare', 'war_attack']);
    const allowed = new Set(['boss_summon', 'boss_attack', 'shop_buy', 'upgrade_member', 'upgrade_building', ...competitionActions]);
    if (!allowed.has(body.action)) {
      const error = new Error('Unknown clan activity');
      error.status = 400;
      throw error;
    }

    const payload = await withLock('clan:global', async () => {
      context.session = await getSession(context.chatId, context.userId);
      let result;

      if (competitionActions.has(body.action)) {
        // Competition actions persist only clan documents. Player combat state is
        // treated as a read-only snapshot, matching the legacy duel/war behavior.
        result = await performClanCompetitionAction(context.userId, context.session, body.action, body);
      } else {
        const prepared = await prepareClanActivity(context.userId, context.session, body.action, body);
        result = prepared.result;
        if (result.ok) {
          if (prepared.savePlayer) await saveSession(context.session);
          if (prepared.clan) await prepared.clan.save();
        }
      }

      const dashboard = await getClanDashboard(context.userId, context.session);
      return { result, dashboard };
    });
"""
text = replace_once(text, old, new, "server clan activity block")
path.write_text(text)


# Add player-facing messages to competition actions.
path = Path("miniapp/clanCompetition.js")
text = path.read_text()
old = """    if (result.ok) {
      const name = await getUserName(Number(opponentId), 'name');
      result.opponentName = name || `Игрок ${opponentId}`;
    }
    return result;
"""
new = """    if (result.ok) {
      const name = await getUserName(Number(opponentId), 'name');
      result.opponentName = name || `Игрок ${opponentId}`;
      result.message = result.result === 'win'
        ? `Победа над ${result.opponentName}! +${result.contributionReward} к вкладу.`
        : result.result === 'loss'
          ? `${result.opponentName} победил в дуэли.`
          : `Ничья с ${result.opponentName}.`;
    }
    return result;
"""
text = replace_once(text, old, new, "pvp result message")
old = """    if (result.ok) {
      await clan.save();
      await target.save();
      result.opponentName = target.name;
    }
    return result;
"""
new = """    if (result.ok) {
      await clan.save();
      await target.save();
      result.opponentName = target.name;
      result.message = `Война объявлена: ${clan.name} против ${target.name}.`;
    }
    return result;
"""
text = replace_once(text, old, new, "war declaration message")
old = """    const result = strikeClanWar(clan, playerSession, userId, opponent?.level || 1);
    if (result.ok) await clan.save();
    return result;
"""
new = """    const result = strikeClanWar(clan, playerSession, userId, opponent?.level || 1);
    if (result.ok) {
      await clan.save();
      result.message = `Атака принесла ${result.points} очков войны${result.isCrit ? ' — крит!' : '.'}`;
    }
    return result;
"""
text = replace_once(text, old, new, "war attack message")
path.write_text(text)


# Replace Mini App placeholders with working PvP and war panels.
path = Path("webapp/clan.js")
text = path.read_text()
reason_anchor = "  unknown_clan_activity: 'Неизвестное клановое действие.',\n"
reason_lines = """  pvp_self: 'Нельзя вызвать на дуэль самого себя.',
  pvp_not_clan_member: 'Игрок не состоит в твоём клане.',
  pvp_opponent_not_in_chat: 'Соперник должен находиться в этом игровом чате.',
  pvp_opponent_no_class: 'У соперника нет боевого класса.',
  pvp_cooldown: 'После дуэли нужно восстановиться.',
  war_target_missing: 'Клан-противник не найден.',
  war_self: 'Нельзя объявить войну своему клану.',
  war_already_active: 'Твой клан уже участвует в войне.',
  war_target_busy: 'Клан-противник уже участвует в войне.',
  war_not_active: 'Клан сейчас не участвует в войне.',
  war_expired: 'Война уже завершилась.',
  war_cooldown: 'Военная атака ещё на перезарядке.',
  unknown_clan_competition: 'Неизвестное соревновательное действие.',
"""
text = replace_once(text, reason_anchor, reason_anchor + reason_lines, "competition reason labels")
activities_anchor = "  function activitiesHtml(clan) {\n"
helpers = r'''  function pvpHtml() {
    const pvp = dashboard.competition?.pvp;
    if (!pvp) return '';
    const record = pvp.record || { wins: 0, losses: 0, draws: 0 };
    return `
      <section class="clan-activity-group"><h4>⚔️ Дружеские дуэли</h4>
        <p class="clan-muted">${record.wins} побед · ${record.losses} поражений · ${record.draws} ничьих</p>
        ${!pvp.ready ? '<p class="clan-muted">Сначала выбери боевой класс.</p>' : ''}
        ${pvp.cooldownRemainingMs > 0 ? `<p class="clan-muted">Следующая дуэль через ${formatDuration(pvp.cooldownRemainingMs)}.</p>` : ''}
        <div class="clan-activity-list">${pvp.opponents?.length ? pvp.opponents.map(opponent => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(opponent.name)}</strong><small>Участник твоего клана в этом чате</small></div><button type="button" data-clan-pvp="${opponent.userId}" ${pvp.ready && pvp.cooldownRemainingMs === 0 ? '' : 'disabled'}>Вызвать</button></article>`).join('') : '<p class="clan-muted">Нет доступных соперников в этом чате.</p>'}</div>
      </section>`;
  }

  function warResultHtml(result) {
    if (!result) return '';
    const label = result.outcome === 'win' ? 'Победа 🏆' : result.outcome === 'loss' ? 'Поражение' : result.outcome === 'draw' ? 'Ничья' : 'Война отменена';
    return `<p class="clan-war-result"><strong>${label}</strong> · ${formatNumber(result.myScore)} : ${formatNumber(result.opponentScore)}</p>`;
  }

  function warHtml(clan) {
    const war = dashboard.competition?.war;
    if (!war) return '';
    if (!war.active) {
      return `
        <section class="clan-activity-group"><h4>🏳️ Войны кланов</h4>
          ${warResultHtml(war.lastResult)}
          ${war.canDeclare ? `<div class="clan-activity-list">${war.targets?.length ? war.targets.map(target => `
            <article class="clan-activity-row"><div><strong>${escapeHtml(target.name)}</strong><small>Ур. ${target.level} · ${target.members} участников</small></div><button type="button" data-clan-war-declare="${target.id}">Объявить войну</button></article>`).join('') : '<p class="clan-muted">Нет свободных кланов-противников.</p>'}</div>` : '<p class="clan-muted">Объявлять войну может только глава клана.</p>'}
        </section>`;
    }
    return `
      <section class="clan-activity-group clan-war-card"><h4>🏳️ Война с ${escapeHtml(war.opponentName)}</h4>
        <div class="clan-war-score"><strong>${formatNumber(war.score)}</strong><span>:</span><strong>${formatNumber(war.opponentScore)}</strong></div>
        <p class="clan-muted">Твой вклад в войну: ${formatNumber(war.myPoints)} · осталось ${formatDuration(war.remainingMs)}</p>
        <button type="button" data-clan-war-attack ${war.cooldownRemainingMs > 0 ? 'disabled' : ''}>${war.cooldownRemainingMs > 0 ? `Перезарядка · ${formatDuration(war.cooldownRemainingMs)}` : 'Атаковать 🗡️'}</button>
      </section>`;
  }

'''
text = replace_once(text, activities_anchor, helpers + activities_anchor, "competition UI helpers")
old = """        ${buildingsHtml(clan, activities)}
        <div class=\"clan-coming\"><article>⚔️ Дуэли · следующий этап</article><article>🏳️ Войны кланов · следующий этап</article></div>
"""
new = """        ${buildingsHtml(clan, activities)}
        ${pvpHtml()}
        ${warHtml(clan)}
"""
text = replace_once(text, old, new, "competition placeholders")
bind_anchor = "    content.querySelectorAll('[data-clan-building]').forEach(button => button.addEventListener('click', () => activity({ action: 'upgrade_building', buildingKey: button.dataset.clanBuilding })));\n"
bind_lines = """    content.querySelectorAll('[data-clan-pvp]').forEach(button => button.addEventListener('click', () => activity({ action: 'pvp_fight', opponentId: button.dataset.clanPvp })));
    content.querySelectorAll('[data-clan-war-declare]').forEach(button => button.addEventListener('click', () => activity({ action: 'war_declare', targetId: button.dataset.clanWarDeclare })));
    content.querySelector('[data-clan-war-attack]')?.addEventListener('click', () => activity({ action: 'war_attack' }));
"""
text = replace_once(text, bind_anchor, bind_anchor + bind_lines, "competition event bindings")
path.write_text(text)


# Add compact war scoreboard styles.
path = Path("webapp/clan.css")
text = path.read_text()
text += "\n.clan-war-score{display:flex;align-items:center;justify-content:center;gap:14px;padding:12px;border-radius:14px;background:rgba(255,255,255,.03)}.clan-war-score strong{font-size:20px}.clan-war-score span{color:var(--muted)}.clan-war-card>button{width:100%;margin-top:8px}.clan-war-result{padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.035);font-size:9px}.clan-war-result strong{color:#ddd0ff}\n"
path.write_text(text)


# Keep syntax checks aligned with the new backend module.
path = Path(".github/workflows/miniapp-ci.yml")
text = path.read_text()
anchor = "          node --check miniapp/clanActivities.js\n"
text = replace_once(text, anchor, anchor + "          node --check miniapp/clanCompetition.js\n", "competition syntax check")
anchor = "          node --check functions/game/clans/clanBossAttack.js\n"
text = replace_once(text, anchor, anchor + "          node --check functions/game/clans/clanDuel.js\n", "duel syntax check")
path.write_text(text)
