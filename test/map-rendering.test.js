import test from 'node:test';
import assert from 'node:assert/strict';
import {displayedPosition} from '../webapp/map-rendering.js';
import {dialogHeading} from '../webapp/dialog-heading.js';
test('movement preview shares running speed across city and room scales without changing the server path',()=>{
 const actor={x:.1,y:.5,path:[{x:.2,y:.5},{x:.2,y:.9}],runSpeed:100};
 assert.deepEqual(displayedPosition(actor,0),{x:.1,y:.5});
 assert.ok(Math.abs(displayedPosition(actor,1000).x-.15)<1e-12);
 assert.ok(displayedPosition(actor,1000,{size:14000}).x<.11);
 const corner=displayedPosition(actor,4000);assert.equal(corner.x,.2);assert.ok(Math.abs(corner.y-.6)<1e-12);
 assert.deepEqual(displayedPosition(actor,60000),{x:.2,y:.9});
 assert.equal(actor.x,.1);assert.equal(actor.path.length,2);
});
test('a dialog heading escapes data from NPC and location names instead of creating markup',()=>{
 const heading=dialogHeading('<img src=x onerror=bad()>',{id:'title" onmouseover="bad'});
 assert.equal(heading.includes('<img'),false);assert.ok(heading.includes('&lt;img'));
 assert.ok(heading.includes('id="title&quot; onmouseover=&quot;bad"'));
 assert.equal(dialogHeading('Death',{dismissible:false}).includes('data-dismiss'),false);
});
