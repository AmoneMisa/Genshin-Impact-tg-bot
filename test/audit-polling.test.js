import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoller} from '../webapp/polling.js';
import {requestJson} from '../webapp/request-json.js';
test('slow reads do not overlap; actions and close invalidate late responses',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const old=globalThis.document;globalThis.document={hidden:false};
  let calls=0,resolve,current,signal;
  const poller=createPoller(async request=>{calls++;current=request.current;signal=request.signal;await new Promise(r=>resolve=r);},{interval:2000});
  try {
    t.mock.timers.tick(2000);assert.equal(calls,1);
    t.mock.timers.tick(10000);assert.equal(calls,1);assert.ok(current());
    poller.invalidate();assert.ok(signal.aborted);assert.equal(current(),false);
    resolve();await new Promise(r=>setImmediate(r));
    t.mock.timers.tick(2000);assert.equal(calls,2);
    poller.stop();assert.equal(current(),false);resolve();await new Promise(r=>setImmediate(r));
    t.mock.timers.tick(20000);assert.equal(calls,2);
  } finally {poller.stop();globalThis.document=old;}
});
test('hidden apps do not start polling',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const old=globalThis.document;globalThis.document={hidden:true};let calls=0;
  const poller=createPoller(()=>{calls++;},{interval:2000});
  try{t.mock.timers.tick(10000);assert.equal(calls,0);}finally{poller.stop();globalThis.document=old;}
});
test('API timeout aborts a hanging request and never retries a POST',async()=>{
  const old=globalThis.fetch;let calls=0;
  globalThis.fetch=async(_url,{signal})=>{calls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));};
  try {await assert.rejects(requestJson('/test',{method:'POST'},5),{name:'AbortError'});assert.equal(calls,1);}
  finally {globalThis.fetch=old;}
});
