import test from 'node:test';
import assert from 'node:assert/strict';
import {requireTransactions} from '../db/requireTransactions.js';

test('startup allows replica sets and sharded clusters using only hello',async()=>{
    for(const hello of [{setName:'rs0'},{msg:'isdbgrid'}]){
        const commands=[];
        await requireTransactions({admin:()=>({command:async command=>{commands.push(command);return hello;}})});
        assert.deepEqual(commands,[{hello:1}]);
    }
});

test('standalone MongoDB fails startup with actionable information',async()=>{
    await assert.rejects(requireTransactions({admin:()=>({command:async()=>({isWritablePrimary:true})})}),
        error=>error.code==='MONGO_TRANSACTIONS_REQUIRED'&&error.message.includes('--replSet rs0'));
});

test('database check failures propagate without guessing transaction support',async()=>{
    const failure=new Error('Unavailable');
    await assert.rejects(requireTransactions({admin:()=>({command:async()=>{throw failure;}})}),error=>error===failure);
});
