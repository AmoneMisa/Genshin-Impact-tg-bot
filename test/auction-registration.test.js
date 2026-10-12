import test from 'node:test';
import assert from 'node:assert/strict';
import {auctionSaleQuote} from '../webapp/auction.js';

test('registration converts unit price to the API total and previews the actual seller fee',()=>{
  assert.deepEqual(auctionSaleQuote('3','101',.05),{valid:true,price:303,fee:15,net:288});
  assert.equal(auctionSaleQuote(1,1_000_000_000).valid,true);
});
test('invalid quantities, unit prices and overflowing totals cannot become auction lots',()=>{
  for(const count of ['',0,-1,1.5,'3x',Infinity])assert.equal(auctionSaleQuote(count,100).valid,false);
  for(const price of ['',0,-1,1.5,'3x',Infinity])assert.equal(auctionSaleQuote(1,price).valid,false);
  assert.equal(auctionSaleQuote(2,1_000_000_000).valid,false);
  assert.equal(auctionSaleQuote(Number.MAX_SAFE_INTEGER,100).valid,false);
});
