"""Manual measurements from the canonical body/face sheets, keyed by painting."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];FILE=ROOT/'art-source/avatars/motion-review/city-halloween-pose-reviews.json'
reviews=json.loads(FILE.read_text(encoding='utf-8')) if FILE.exists() else {}
def add(cid,race,coords,eyes,props,hair,cloth,held='-',start=.27):
    gender='female' if cid in ['chrome-district','obsidian-gloss','neon-afterglow','moonveil-phantom'] else 'male'
    key=f'{cid}-{race}-{gender}'
    reviews[key]=dict(coordinates=coords,eyePixels=eyes,props=props,hair='l' if hair else 'n',held=held,
      hairRegions=hair,clothRegions=cloth,clothStart=start,
      review='Individually traced shoulders, hands, waist, feet, accessory bounds, loose cloth and visible eyes from canonical 512x768 source review sheets.')
    if race=='dwarf' and gender=='female':reviews[key]['eyeRadiusY']=.0065
    return reviews[key]

# Chrome District: crossed/offset boots and wrist terminal follow each painting.
cid='chrome-district'
add(cid,'human',[42,65,21,32,47,72,49,36,45,87,64,91,42,36,64,35],[[228,104],[249,97]],[[68,39,74,44]],[[.39,.16,.025,.045,1]],[[.64,.35,.022,.035,1.2]])
add(cid,'elf',[41,65,21,31,48,72,51,36,45,87,64,91,40,36,64,35],[[238,105],[257,100]],[[68,40,75,46]],[[.40,.17,.025,.05,1]],[[.64,.35,.022,.035,1.2]])
add(cid,'darkElf',[40,64,21,31,48,72,50,36,45,87,63,91,40,36,64,35],[[226,101],[246,93]],[[68,40,75,46]],[[.39,.16,.028,.05,1]],[[.64,.35,.022,.035,1.2]])
add(cid,'orc',[40,65,21,31,48,75,51,36,45,87,66,91,40,36,65,35],[[227,98],[246,91]],[[69,40,76,46]],[[.63,.25,.028,.07,1.3]],[[.65,.35,.022,.035,1.2]])
add(cid,'dwarf',[38,65,28,28,53,76,57,44,48,86,66,87,40,43,67,43],[[229,143],[257,131]],[[67,46,76,52]],[[.64,.35,.032,.075,1.3]],[[.67,.43,.022,.035,1.2]])
r=add(cid,'kamael',[37,59,22,30,49,70,51,37,43,88,61,91,24,42,64,35],[[219,116],[238,107]],[[64,41,72,46]],[[.59,.24,.025,.065,1.3]],[[.63,.35,.02,.035,1.1]])
r['wing']=dict(pivot=[.60,.22],outline=[[.65,.13],[.81,.16],[.99,.42],[.97,.64],[.85,.55],[.68,.28],[.60,.22]],amplitude=.022,period=7.8,phase=0,reviewPoints=[[.90,.41],[.92,.45]],foregroundAreas=[[.64,.41,.72,.46,.008]])
r['capeReview']=dict(ornament=[.23,.12,.43,.24],clothRegions=[[.25,.40,.025,.06,1.3],[.24,.50,.025,.06,1.3]],reviewPoints=[[.25,.40],[.24,.50]],clothStart=.28)

# Obsidian Gloss: the fitted glossy jacket/trousers receive no cloth wave.
cid='obsidian-gloss'
add(cid,'human',[39,61,21,32,48,73,50,36,49,87,69,86,64,27,64,27],[[227,107],[249,100]],[],[[.39,.16,.027,.045,1]],[[.65,.28,.035,.045,1.2]],start=.18)
add(cid,'elf',[39,61,21,32,48,73,50,36,49,87,70,86,64,27,64,27],[[227,102],[247,96]],[],[[.62,.24,.026,.07,1.3]],[[.66,.28,.035,.045,1.2]],start=.18)
add(cid,'darkElf',[39,62,22,32,48,73,50,37,49,88,70,87,64,27,64,27],[[230,112],[250,101]],[],[[.39,.18,.026,.045,1]],[[.67,.29,.035,.045,1.2]],start=.18)
add(cid,'orc',[39,63,21,32,48,74,50,37,49,88,71,87,64,27,64,27],[[230,98],[250,91]],[],[[.62,.24,.028,.07,1.3]],[[.67,.29,.035,.045,1.2]],start=.18)
add(cid,'dwarf',[37,64,27,29,53,75,55,44,47,85,70,84,69,34,69,34],[[227,135],[257,126]],[],[[.66,.34,.032,.075,1.3]],[[.70,.35,.032,.04,1.2]],start=.22)
r=add(cid,'kamael',[37,55,22,30,49,67,50,36,44,88,63,87,25,40,60,27],[[213,116],[232,109]],[],[[.59,.23,.024,.07,1.3]],[[.59,.27,.025,.04,1.1]],start=.18)
r['wing']=dict(pivot=[.59,.22],outline=[[.64,.13],[.83,.17],[.99,.44],[.97,.74],[.84,.64],[.67,.30],[.59,.22]],amplitude=.022,period=7.8,phase=0,reviewPoints=[[.87,.43],[.90,.49]])
r['capeReview']=dict(ornament=[.23,.13,.43,.25],clothRegions=[[.25,.38,.022,.055,1.3],[.255,.46,.022,.055,1.3]],reviewPoints=[[.25,.38],[.255,.46]],clothStart=.27)

FILE.write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Saved',len(reviews),'individual city/Halloween pose reviews')
