"""Standalone review of the local client assets actually selected for game screens."""
import json,html
from pathlib import Path
plan=json.loads(Path('.tmp/l2-icon-import-plan.json').read_text(encoding='utf-8'))
def card(label,art):
    return f'<figure><img src="../webapp/art/l2/{art}-128.webp" width="64" height="64" alt=""><figcaption>{html.escape(label)}</figcaption></figure>'
groups={
 'Валюты, свитки и самоцветы':[k for k in plan['materials'] if k in ['gold','aa'] or k.startswith(('scroll_','blessed_','safe_','crystal_','craft_gem_'))],
 'Камни жизни':[k for k in plan['materials'] if k.startswith('lifestone_')],
 'Атрибуты':[k for k in plan['materials'] if k.startswith('attr_')],
 'Печати и кристаллы души':[k for k in plan['materials'] if k.startswith('seal_') or k.startswith('soul_') and k.endswith('_13')],
 'Заряды':[k for k in plan['materials'] if k.startswith(('soulshot_','spiritshot_','blessed_spiritshot_'))],
 'Расходники и яйца':[k for k in plan['materials'] if k.startswith(('potion-','elixir-','egg_'))],
}
sections=''.join(f'<section><h2>{title}</h2><div class="grid">'+''.join(card(k,plan['materials'][k]) for k in keys)+'</div></section>' for title,keys in groups.items())
sections+='<section><h2>Категории дропа</h2><div class="grid">'+''.join(card(k,v) for k,v in plan['categories'].items())+'</div></section>'
sections+='<section><h2>Свитки ОП, пустой свиток и лак Маммона</h2><div class="grid">'+''.join(card(k,v) for k,v in plan['highlights'].items())+'</div></section>'
sections+='<section><h2>Бижутерия</h2><div class="grid">'+''.join(card(k,v) for k,v in plan['catalog'].items())+'</div></section>'
sections+='<section><h2>Недостающие предметы: готовые L2-иконки</h2><p>Прежние картины не заменены. Для этих предметов собственной картины ещё не было.</p><div class="grid">'+''.join(card(row['name'],row['art']) for row in plan['equipmentReferences'])+'</div></section>'
sections+='<section><h2>Торговцы</h2><div class="banners">'+''.join(f'<figure><img src="../webapp/art/merchants/{name}-720.webp" width="720" height="480" alt=""><figcaption>{label}</figcaption></figure>' for name,label in [('weapons','Оружие'),('armor','Доспехи'),('jewelry','Бижутерия'),('alchemist','Мастера'),('mammon','Маммон')])+'</div></section>'
sections+='<section><h2>Эмблема группы</h2><img class="emblem" src="../webapp/art/icons/party-emblem-256.webp" width="160" height="160" alt=""></section>'
Path('docs/l2-assets-preview.html').write_text('''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Обновлённые изображения L2</title><style>body{margin:0;background:#101412;color:#ddd8c4;font:14px/1.5 system-ui}main{max-width:1080px;margin:auto;padding:24px}h1,h2{color:#dfc185}section{margin:32px 0}figure{margin:0;min-width:0;text-align:center;padding:12px;background:#19201d;border:1px solid #544a30;border-radius:8px}figcaption{margin-top:8px;overflow-wrap:anywhere;font-size:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}.grid img{image-rendering:pixelated}.banners{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}.banners img{width:100%;height:auto}.emblem{object-fit:contain}</style><main><h1>Обновлённые изображения L2</h1><p>Оригинальные иконки из предоставленных ассетов: '''+str(len(plan['assets']))+'''. Готовые изображения оружия, брони и щитов сохранены.</p><p>Иконки используют исходные пиксели и цвета клиента. Пять торговых сцен и эмблема группы — новые иллюстрации.</p>'''+sections+'</main></html>',encoding='utf-8')
