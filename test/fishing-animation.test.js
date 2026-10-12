import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('fishing artwork stays within the mobile download and decoding budget',()=>{
    let total=0;
    for(const name of ['idle','casting','waiting','pulling','success','failure','poster','success-still','failure-still']){
        const data=fs.readFileSync(`webapp/art/fishing/${name}.webp`);total+=data.length;
        assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
        assert.ok(data.length<=24000,`${name} exceeds its download budget`);
        if(data.toString('ascii',12,16)==='VP8X'){
            assert.equal(data.readUIntLE(24,3)+1,256);assert.equal(data.readUIntLE(27,3)+1,160);
        }
        if(['idle','poster','success-still','failure-still'].includes(name))assert.ok(!data.includes(Buffer.from('ANIM')),`${name} must be static`);
    }
    assert.ok(total<=100000,`total artwork is ${total} bytes`);
});
