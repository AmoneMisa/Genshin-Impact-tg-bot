const PRIZE_ICONS = {
  experience: '✦',
  gold: '🪙',
  crystals: '💎',
  nothing: '🌫️',
  sword: '⚔️',
  brokenSword: '🗡️',
  immuneToUpSword: '🛡️',
};

function rewardText(prize) {
  if (prize.type === 'nothing') return 'Пусто';
  if (prize.type === 'immuneToUpSword') return 'Иммунитет';
  const amount = Number(prize.amount) || 0;
  const sign = amount > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('ru-RU').format(amount)}`;
}

function setCounter(element, chestState) {
  if (!chestState.available && !chestState.selectionsLeft) {
    element.textContent = 'Попытка восстановится после дневного сброса';
    return;
  }
  element.textContent = `Осталось выбрать: ${chestState.selectionsLeft}`;
}

export async function openChestGame({ api, renderState, haptic, statusElement }) {
  const chestState = await api('/api/chest');
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay chest-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass">
      <header class="overlay-head">
        <div>
          <div class="eyebrow">СУНДУКИ · WEBGL MODE</div>
          <h2>Выбери три</h2>
        </div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Награда определяется на сервере в момент открытия. Повторный выбор одного сундука заблокирован.</p>
      <div class="chest-counter"></div>
      <div class="chest-grid" role="grid" aria-label="Сундуки"></div>
      <div class="chest-result" aria-live="polite"></div>
    </div>`;

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const grid = overlay.querySelector('.chest-grid');
  const counter = overlay.querySelector('.chest-counter');
  const result = overlay.querySelector('.chest-result');
  let localState = chestState;
  let pending = false;

  const opened = new Set(chestState.opened || []);
  const buttons = [];

  for (let chestId = 1; chestId <= 9; chestId += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chest-tile';
    button.dataset.chestId = String(chestId);
    button.innerHTML = `<span class="chest-glow"></span><span class="chest-lid">✦</span><span class="chest-body">▰</span><small>${chestId}</small>`;

    if (opened.has(chestId)) {
      button.classList.add('opened', 'historical');
      button.disabled = true;
    }

    button.addEventListener('click', async () => {
      if (pending || button.disabled || !localState.available) return;
      pending = true;
      haptic('medium');
      button.classList.add('opening');
      buttons.forEach((item) => { item.disabled = true; });

      try {
        const payload = await api('/api/chest/open', {
          method: 'POST',
          body: JSON.stringify({ chestId }),
        });

        localState = {
          available: payload.tries > 0,
          tries: payload.tries,
          opened: payload.opened,
          selectionsLeft: payload.selectionsLeft,
        };

        const icon = PRIZE_ICONS[payload.prize.type] || '✦';
        button.classList.remove('opening');
        button.classList.add('opened');
        button.innerHTML = `<span class="reward-icon">${icon}</span><strong>${rewardText(payload.prize)}</strong><small>${payload.prize.label}</small>`;
        result.textContent = payload.completed
          ? 'Три сундука открыты. Следующая попытка — после дневного сброса.'
          : `Получено: ${rewardText(payload.prize)} ${payload.prize.label}`;

        setCounter(counter, localState);
        if (payload.state) renderState(payload.state);
        haptic(payload.prize.type === 'nothing' ? 'light' : 'heavy');

        if (payload.completed) {
          overlay.classList.add('completed');
        }
      } catch (error) {
        button.classList.remove('opening');
        result.textContent = error.message;
        statusElement.textContent = `Сундуки: ${error.message}`;
        haptic('light');
      } finally {
        pending = false;
        buttons.forEach((item) => {
          const id = Number(item.dataset.chestId);
          item.disabled = item.classList.contains('opened') || !localState.available || (localState.opened || []).includes(id);
        });
      }
    });

    buttons.push(button);
    grid.appendChild(button);
  }

  setCounter(counter, chestState);
  if (!chestState.available) {
    result.textContent = 'Сегодняшняя попытка уже использована.';
    buttons.forEach((button) => { button.disabled = true; });
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
