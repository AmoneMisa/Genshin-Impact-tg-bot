"""Complete High Five equipment reference gallery, from the same item and armor-set snapshot."""
import json,html,zipfile
from pathlib import Path
from PIL import Image
plan=json.loads(Path('.tmp/l2-icon-import-plan.json').read_text(encoding='utf-8'))
dest=Path('webapp/art/l2')
keys={row['art'] for row in plan['cloaks'] if row['art']}
keys.update(part['art'] for row in plan['armorSets'] for part in row['parts'] if part['art'])
for asset in plan['assets']:
    if asset['key'] in keys:
        with Image.open(asset['source']) as image:
            image.convert('RGBA').resize((32,32),Image.Resampling.NEAREST).save(dest/(asset['key']+'-32.webp'),lossless=True)
manifest={'snapshot':'9fb01cb20513e55190cdde8d91e41be2c0914f84','sets':plan['armorSets'],'cloaks':plan['cloaks']}
(dest/'high-five-equipment.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(dest/'high-five-equipment.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
    archive.write(dest/'high-five-equipment.json','manifest.json')
    for key in sorted(keys):archive.write(dest/(key+'-32.webp'),key+'-32.webp')
slot_names={'chest':'Верх','legs':'Низ','head':'Голова','gloves':'Перчатки','feet':'Сапоги','shield':'Щит'}
def image(row):
    return f'<img src="../webapp/art/l2/{row["art"]}-32.webp" width="32" height="32" alt="">'
def part(row):
    return '<figure>'+image(row)+'<figcaption>'+slot_names[row['slot']]+'<br>'+html.escape(row['name'])+f'<br><small>ID {row["id"]}</small></figcaption></figure>'
cloaks=''.join('<figure>'+image(row)+'<figcaption>'+html.escape(row['name'])+f'<br><small>ID {row["id"]} · оригинал L2</small></figcaption></figure>' for row in plan['cloaks'])
sets=''
for row in sorted(plan['armorSets'],key=lambda row:row['id']):
    first={};variants=[]
    for item in row['parts']:
        if item['slot'] not in first:first[item['slot']]=item
        else:variants.append(item)
    details='<details><summary>Другие варианты частей ('+str(len(variants))+')</summary><div class="parts">'+''.join(part(item) for item in variants)+'</div></details>' if variants else ''
    sets+=f'<article data-name="{html.escape(row["name"],quote=True).lower()}" data-grade="{row.get("grade","")}" data-type="{row.get("armor","")}"><h3>'+html.escape(row['name'])+f'</h3><p>{row.get("grade","")} · {row.get("armor","")} · set ID {row["id"]} · оригинал L2</p><div class="parts">'+''.join(part(item) for item in first.values())+'</div>'+details+'</article>'
output='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Все сеты и плащи High Five</title><style>body{margin:0;background:#111512;color:#d8d1bd;font:14px/1.5 system-ui}main{max-width:1080px;margin:auto;padding:20px}h1,h2,h3{color:#dfc185}a{color:#cfb780}figure{margin:0;padding:10px;min-width:0;background:#1a211c;border:1px solid #514a36;text-align:center}img{image-rendering:pixelated}figcaption{font-size:11px;overflow-wrap:anywhere}small{color:#96907f}.grid,.parts{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}article{padding:14px;margin:16px 0;border:1px solid #645435;background:#171c18;overflow:hidden}article h3{margin:0}article p{font-size:12px}details{margin-top:12px}input{box-sizing:border-box;width:100%;padding:12px;background:#1a211c;color:#eee;border:1px solid #645435;font:inherit}.sticky{position:sticky;top:0;background:#111512;padding:8px 0}article[hidden]{display:none}</style><main><h1>Все комплекты и плащи High Five</h1><p>'''+str(len(plan['armorSets']))+' конфигураций комплектов и '+str(len(plan['cloaks']))+''' записей плащей из полного списка High Five. Повторные варианты одного предмета могут иметь общую иконку. Изображения — оригинальные ассеты L2 размером 32×32.</p><p><a href="l2-painted-icons-preview.html">Прежние рисованные предметы в оформлении L2</a> · <a href="../webapp/art/l2/high-five-equipment.zip" download>Скачать иконки всех комплектов и плащей</a></p><h2 id="cloaks">Плащи, включая рейдовые и душевные</h2><div class="grid">'''+cloaks+'''</div><h2>Полный список комплектов</h2><div class="sticky"><input id="search" type="search" placeholder="Название сета: Moirai, Elegia, Vesper, Dynasty…" aria-label="Поиск комплекта"></div>'''+sets+'''</main><script>document.querySelector('#search').addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();document.querySelectorAll('article').forEach(item=>item.hidden=!item.dataset.name.includes(query));});</script></html>'''
Path('docs/l2-high-five-equipment-preview.html').write_text(output,encoding='utf-8')
print(f"Complete reference: {len(plan['armorSets'])} sets, {len(plan['cloaks'])} cloaks, {len(keys)} original icons")
