import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVATAR_COSTUME_VARIANTS} from '../webapp/art/avatar-costume-art.js';
import {AVATAR_COSTUME_RIGS} from '../webapp/art/avatar-costume-rigs.js';
import {deformCostumePoint} from '../webapp/avatar-costume-rig.js';

const themes={
  'ashen-dragon-mantle':'Ashen Dragon Mantle','crimson-peacock':'Crimson Peacock',
  'violet-dusk-prince':'Violet Dusk Prince','sapphire-diadem':'Sapphire Diadem',
  'void-pulse':'Void Pulse','saltwind-corsair':'Saltwind Corsair',
  'quiet-rooftop':'Quiet Rooftop','cobblestone-sunday':'Cobblestone Sunday',
  'seabreeze-holiday':'Seabreeze Holiday','cozy-reef':'Cozy Reef',
  'hearthside-purr':'Hearthside Purr','moonlit-mischief':'Moonlit Mischief',
  'meadow-flutter':'Meadow Flutter',
};
const reviews=JSON.parse(readFileSync(new URL('../art-source/avatars/motion-review/additional-pose-reviews.json',import.meta.url)));
const capes=JSON.parse(readFileSync(new URL('../art-source/avatars/kamael-capes/motion.json',import.meta.url)));

test('the thirteen requested themes have English names and six individually reviewed animated variants',()=>{
  for(const [id,name]of Object.entries(themes)){
    const variants=AVATAR_COSTUME_VARIANTS.filter(v=>v.costumeId===id);
    assert.equal(variants.length,6,id);
    assert.equal(new Set(variants.map(v=>v.race)).size,6,id);
    for(const variant of variants){
      assert.equal(variant.name,name);
      const review=reviews[variant.key];assert.ok(review,variant.key);
      const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+variant.key];
      assert.ok(rig,variant.key);assert.equal(rig.poseReview.key,variant.key);
      assert.equal(rig.eyes.length,2,variant.key+' visible eyes blink');
      const eyePixels=capes[variant.key]?.eyePixels??review.eyePixels;
      for(let i=0;i<2;i++){
        assert.ok(Math.abs(rig.eyes[i][0]-eyePixels[i][0]/512)<.00001);
        assert.ok(Math.abs(rig.eyes[i][1]-eyePixels[i][1]/768)<.00001);
      }
      assert.equal(Boolean(rig.wing),variant.race==='kamael');
    }
  }
});

test('animal costume tails and butterfly cloth edges visibly move while feet stay planted',()=>{
  for(const id of ['cozy-reef','hearthside-purr','moonlit-mischief','meadow-flutter']){
    for(const variant of AVATAR_COSTUME_VARIANTS.filter(v=>v.costumeId===id)){
      const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+variant.key];
      const motions=rig.cloth.map(([x,y])=>{
        const positions=Array.from({length:24},(_,i)=>deformCostumePoint(x,y,rig,i/4));
        return (Math.max(...positions.map(p=>p[0]))-Math.min(...positions.map(p=>p[0])))*320;
      });
      assert.ok(Math.max(...motions)>.8,variant.key+' loose costume edge should move');
      for(const foot of rig.poseReview.feet)for(const t of [0,2,4,6])assert.deepEqual(deformCostumePoint(...foot,rig,t),foot);
    }
  }
});

test('Kamael butterfly cape has a protected rigid ornament above its hanging cloth',()=>{
  const key='meadow-flutter-kamael-female',review=reviews[key];
  assert.equal(review.capeReview.construction,'narrow hanging banner with rigid wing ornament');
  const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+key];
  const [x0,y0,x1,y1]=review.capeReview.rigidOrnament;
  const point=[(x0+x1)/2,(y0+y1)/2];
  for(const t of [0,1,2,3,4])assert.deepEqual(deformCostumePoint(...point,rig,t),point);
  assert.equal(rig.wing.amplitude,.022,'Natural wing keeps its independent animation');
});
