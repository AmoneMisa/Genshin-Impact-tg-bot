import {dialogHeading} from './dialog-heading.js';
import {escapeHtml} from './escape-html.js';
const GUIDES = [
  { id: 'hub', icon: '✨', title: 'Город', text: 'Открой игру командой /play или /start. Здания в городе открывают игры, инвентарь, постройки и анкеты.' },
  { id: 'boss', icon: '⚔️', title: 'Босс', text: 'В чате живёт один общий босс. Бейте его всем чатом — награду получает каждый участник рейда.' },
  { id: 'arcade', icon: '🎲', title: 'Аркада', text: 'Кубики, боулинг, дартс, футбол, баскетбол и слоты — в одном зале. Зависшую партию можно сбросить прямо оттуда.' },
  { id: 'profile', icon: '🧙', title: 'Персонаж', text: 'Класс, пол, характеристики, инвентарь, снаряжение и постройки — у каждого свой экран.' },
  { id: 'forms', icon: '📝', title: 'Анкеты', text: 'Заполни свою Genshin-анкету и загляни в анкеты других участников чата.' },
  { id: 'updates', icon: '🔔', title: 'Что нового', text: 'Включи уведомления, чтобы узнавать о новых играх и возможностях первым. Новости приходят в личку от бота.' },
  { id: 'mute', icon: '🔇', title: 'Само-мут', text: 'Нужна пауза? Само-мут на 2 минуты запретит тебе писать в чат. Работает, если у бота есть права администратора.' },
  { id: 'contact', icon: '💬', title: 'Связь с разработчиком', text: 'Нашёл баг или есть идея? Открой «Связь с разработчиком» в Mini App.' },
];
export async function openHelpGame({haptic,statusElement}) {
  const overlay=document.createElement('section');overlay.className='game-overlay help-overlay';
  overlay.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel glass help-panel">${dialogHeading("Справка").replace('data-dismiss','class="overlay-close" data-dismiss')}<div data-help-content></div></div>`;
  const close=()=>{haptic?.('light');overlay.remove();};
  overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
  const content=overlay.querySelector('[data-help-content]');
  content.innerHTML='<div class="help-guide-grid">'+GUIDES.map(guide=>'<article class="help-guide-card"><span>'+guide.icon+'</span><div><strong>'+escapeHtml(guide.title)+'</strong><p>'+escapeHtml(guide.text)+'</p></div></article>').join('')+'</div><p class="help-legacy-note">/play · /start</p>';
  document.body.appendChild(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
  statusElement.textContent='Справка открыта.';
}
