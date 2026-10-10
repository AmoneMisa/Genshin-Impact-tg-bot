import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
try{for(const width of [320,390,540,1100]){
 const page=await browser.newPage({viewport:{width,height:950}});
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/city.css"><style>body{margin:0;background:#0b0d18}.app-shell{max-width:900px;margin:auto;padding:18px}</style><main class="app-shell" id="root"></main>'});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{
  const {mountCity}=await import('/city.js');
  const {startEmojiIcons}=await import('/icons.js');startEmojiIcons();
  const buildings=Object.entries({palace:'Дворец',forge:'Кузня',crystalLake:'Озеро кристаллов',traineeArea:'Казармы',goldMine:'Золотая шахта',ironDeposit:'Залежи руды',academy:'Академия'}).map(([id,name])=>({id,name,currentLevel:1,currentType:'common',maxLevel:30,canUpgrade:false,upgradeCost:{gold:2000,crystals:300,ironOre:60}}));
  await mountCity(document.querySelector('#root'),{api:async()=>({buildings})});
 });
 await page.locator('.city-building-image').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
 const style=await page.locator('.city.has-map').evaluate(node=>({size:getComputedStyle(node).backgroundSize,duplicate:getComputedStyle(node.querySelector('.city-grid'),'::before').content}));
 assert.match(style.size,/cover/);assert.equal(style.duplicate,'none');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(width===390)await page.screenshot({path:'docs/city-background-390.png',fullPage:true,animations:'disabled'});
 await page.close();console.log(`Continuous city backdrop verified at ${width}px`);
}}finally{await browser.close();}
