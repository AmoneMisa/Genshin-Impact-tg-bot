"""Compile individually annotated poses; never invent a missing annotation."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]; folder=root/'art-source/avatars/motion-review'
items=json.loads((folder/'pose-items.json').read_text(encoding='utf-8'))
eyes=json.loads((folder/'calibrated-eyes.json').read_text(encoding='utf-8'))
annotations={}
annotation_keys=json.loads((folder/'pose-annotation-keys.json').read_text(encoding='utf-8'))
current_indices={key:i for i,(key,file) in enumerate(items)}
for line in (folder/'pose-annotations.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'):continue
    values=line.split();index=int(values[0]);assert index not in annotations
    assert len(values)==19,(index,len(values))
    current=current_indices[annotation_keys[index]]
    annotations[current]=([int(v)/100 for v in values[1:17]],values[17],values[18])
additional=json.loads((folder/'additional-pose-reviews.json').read_text(encoding='utf-8'))
for key,review in additional.items():
    assert len(review['coordinates'])==16,key
    annotations[current_indices[key]]=([v/100 for v in review['coordinates']],review['hair'],review['held'])
cape_motion=root/'art-source/avatars/kamael-capes/motion.json'
if cape_motion.exists():
    for key,review in json.loads(cape_motion.read_text(encoding='utf-8')).items():
        if 'coordinates' not in review:continue
        for target in [key]+(['kamael-male'] if key=='violet-courtier-kamael-male' else ['kamael-female'] if key=='crimson-dawn-kamael-female' else []):
            index=current_indices[target];_,hair,held=annotations[index]
            annotations[index]=([v/100 for v in review['coordinates']],hair,held)
assert set(annotations)==set(range(len(items))),'Every published painting needs its own annotation'
# Accessory bounds traced from numbered sheets. Coordinates in portrait percentages.
props={67:[[15,4,31,75]],69:[[32,27,47,40]],70:[[45,44,62,56]],71:[[43,36,75,46]],
       78:[[72,31,94,56]],79:[[59,23,78,43]],80:[[17,22,42,42]],81:[[66,22,85,43]],
       82:[[55,32,80,53]],83:[[15,41,32,60]],84:[[64,43,78,55]],85:[[62,22,75,41]],
       86:[[66,42,81,55]],87:[[24,43,40,57]],88:[[24,50,45,64]],89:[[14,42,31,64]],
       167:[[23,44,37,55]],186:[[65,44,83,53]],187:[[66,44,84,54]],188:[[65,43,87,60]],
       189:[[21,43,36,57]],190:[[23,49,42,62]],191:[[20,43,34,56]],
       204:[[21,43,33,57]],205:[[20,43,34,56]],206:[[21,42,36,57]]}
def protect(indices,bounds):
    for i in indices:props.setdefault(i,[]).append(bounds)
protect(range(96,102),[4,43,36,93])
protect(range(102,108),[9,4,34,88])
protect([108,113],[12,8,38,83]);protect([109,110,111],[61,10,87,81]);protect([112],[63,27,86,82])
protect([120,121,125],[9,4,38,90]);protect([122,123,124],[69,4,92,90])
protect(range(126,132),[34,43,72,93])
protect(range(138,144),[21,44,92,93])
protect(range(150,156),[11,19,35,92])
protect([162,163,164],[27,12,44,34]);protect([165],[61,13,80,36]);protect([166],[66,31,89,56])
protect(range(168,174),[10,8,32,93])
protect([174,175],[21,9,43,87]);protect([176],[15,26,38,85]);protect([178],[65,13,87,84]);protect([179],[17,13,37,72])
protect(range(180,186),[17,4,35,87]);protect([180,181,183,184],[61,34,91,77])
protect([192,194,195],[65,10,92,92]);protect([193,196,197],[11,9,33,92])
protect(range(198,204),[10,39,50,93])
for key,review in additional.items():
    if review.get('props'):props[current_indices[key]]=review['props']
result={}
for index,(key,file) in enumerate(items):
    coords,hair_style,held=annotations[index]
    sl,sr,sy,lx,ly,rx,ry,waist,fl,fly,fr,fry,cl,cly,cr,cry=coords
    path='/'+file.removeprefix('webapp/').replace('-512.webp','')
    pair=eyes.get(key);cx=sum(p[0] for p in pair)/2 if pair else (sl+sr)/2
    cy=sum(p[1] for p in pair)/2 if pair else .15
    dwarf='dwarf-' in key;wide=dwarf or 'orc-' in key
    radius=.045 if wide else .027
    fixed=[[cx-.075,sy+.04,cx+.075,waist+.03,.015],
           [fl-.065,fly-.08,fl+.065,min(1,fly+.04),.012],
           [fr-.065,fry-.08,fr+.065,min(1,fry+.04),.012]]
    # Eye/face remain geometrically intact. Blinking only changes eyelid pixels.
    fixed.append([cx-.037,cy-.025,cx+.037,cy+.029,.012])
    arms=[]
    for side,sx,hx,hy in [('L',sl,lx,ly),('R',sr,rx,ry)]:
        if held=='B' or held==side:
            fixed.append([min(sx,hx)-.12,sy-.025,max(sx,hx)+.12,max(sy,hy)+.065,.015])
        else:
            arms.append([sx,sy,hx,hy,radius,.018 if dwarf else .022,0 if side=='L' else .8])
    accessory_areas=[[a/100,b/100,c/100,d/100,.008] for a,b,c,d in props.get(index,[])]
    # A prop crossing the other hand must not leave a moving upper arm with a
    # frozen wrist. Hold the entire connected arm in that case.
    for arm in arms[:]:
        sx,ay,hx,hy,*_=arm
        samples=[(sx+(hx-sx)*t,ay+(hy-ay)*t) for t in [.65,.8,1]]
        if any(a-.01<=x<=c+.01 and b-.01<=y<=d+.01 for x,y in samples for a,b,c,d,_ in fixed+accessory_areas):
            arms.remove(arm)
            fixed.append([min(sx,hx)-.12,sy-.025,max(sx,hx)+.12,max(sy,hy)+.065,.015])
    fixed.extend(accessory_areas)
    # Fixed leg paths follow each foot, including crossed and offset stances.
    legs=[[cx-.025,waist+.10,fl,fly-.045,.055 if wide else .040],
          [cx+.025,waist+.10,fr,fry-.045,.055 if wide else .040]]
    if hair_style=='n':hair=[]
    elif hair_style=='b':hair=[[cx,cy+.065,.060,.036,.8]]
    elif hair_style=='t':hair=[[cx-.18,cy+.025,.065,.065,1.6],[cx+.18,cy+.025,.065,.065,1.6]]
    elif hair_style=='s':hair=[[cx-.060,cy+.045,.024,.042,.9],[cx+.065,cy+.045,.024,.042,.9]]
    else:hair=[[cx-.10,cy+.12,.034,.075,.9 if hair_style=='r' else 1.4],
               [cx+.11,cy+.14,.038,.085,.9 if hair_style=='r' else 1.4]]
    cloth=[[cl,cly,.065,.07 if dwarf else .10,1.3],[cr,cry,.065,.07 if dwarf else .10,1.3]]
    review=additional.get(key,{})
    cloth=review.get('clothRegions',cloth)
    hair=review.get('hairRegions',hair)
    if 24<=index<30 or 144<=index<150:cloth=[] # Metal feather panels: no elastic warp.
    result[path]={'face': [cx,cy], 'arms':arms,'hair':hair,'cloth':cloth,'fixedAreas':fixed,
                  'fixedPaths':legs,'clothStart':review.get('clothStart',waist+.07),'breathStrength':.7,
                  'poseReview':{'key':key,'sheet':index//6,'index':index,'heldSides':held,
                    'shoulders':[[sl,sy],[sr,sy]],'hands':[[lx,ly],[rx,ry]],
                    'feet':[[fl,fly],[fr,fry]],'accessoryAreas':accessory_areas}}
    if 'eyeRadiusY' in review:result[path]['eyeRadiusY']=review['eyeRadiusY']
    if review.get('noVisibleEyes'):result[path]['noVisibleEyes']=review['noVisibleEyes']
# Preserve the already demonstrated elf/dwarf articulated settings while adding
# pose review and support-foot/leg protection from the same individual drawings.
previous=json.loads((folder/'pose-motion.json').read_text(encoding='utf-8'))
for path in ['/art/avatars/races/v3/dwarf-female','/art/avatars/races/v2/elf-female']:
    if path in previous:
        result[path].update({k:v for k,v in previous[path].items() if k not in ['poseReview','fixedPaths']})
cape_folder=root/'art-source/avatars/kamael-capes'
if (cape_folder/'motion.json').exists():
    cape_reviews=json.loads((cape_folder/'motion.json').read_text(encoding='utf-8'))
    cape_jobs=json.loads((cape_folder/'jobs.json').read_text(encoding='utf-8'))
    for job in cape_jobs:
        if job['status']!='reviewed':continue
        review=cape_reviews[job['key']]
        targets=['/art/avatars/collections/v1/'+job['key']]+['/art/avatars/races/v2/'+key for key in job['defaultAliases']]
        for path in targets:
            rig=result[path]
            if 'propPaths' in review:
                old=rig['poseReview']['accessoryAreas']
                rig['fixedAreas']=[area for area in rig['fixedAreas'] if area not in old]
                new=[area+[.008] for area in review.get('propAreas',[])]
                rig['fixedAreas'].extend(new)
                rig['fixedPaths'].extend(review['propPaths'])
                rig['poseReview']['accessoryAreas']=new
            # A held arm used a broad rectangular guard before a banner existed
            # behind it. Follow the actual limb so visible cape fabric stays free.
            pose=rig['poseReview']
            for (sx,sy),(hx,hy) in zip(pose['shoulders'],pose['hands']):
                guard=[min(sx,hx)-.12,sy-.025,max(sx,hx)+.12,max(sy,hy)+.065,.015]
                matches=[area for area in rig['fixedAreas'] if all(abs(a-b)<1e-8 for a,b in zip(area,guard))]
                if matches:
                    for area in matches:rig['fixedAreas'].remove(area)
                    rig['fixedPaths'].append([sx,sy,hx,hy,.035])
            rig['cloth'].extend(review['clothRegions'])
            rig['clothStart']=min(rig['clothStart'],review.get('clothStart',.28))
            ornament=review['ornament']+[.006]
            rig['fixedAreas'].append(ornament)
            rig['poseReview']['accessoryAreas'].append(ornament)
            rig['capeReview']={'construction':'narrow hanging banner with rigid wing ornament',
                               'ornament':review['ornament'],'reviewPoints':review['reviewPoints'],
                               'sourceKey':job['key']}
(folder/'pose-motion.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Compiled',len(result),'individual poses;',sum(len(r['arms']) for r in result.values()),'free arms;',len(props),'accessory protections')
