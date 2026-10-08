import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {routePlan} from '../game.js';
const edges=[['dc','bal'],['bal','phi'],['phi','nyc'],['nyc','bos'],['har','bos'],['pro','bos'],['scr','nyc'],['alb','nyc'],['buf','alb'],['nyc','har'],['nyc','pro'],['scr','alb'],['buf','scr'],['bal','nyc'],['dc','phi']];
const names={dc:'Washington DC',bal:'Baltimore',phi:'Philadelphia',nyc:'New York',bos:'Boston',har:'Hartford',pro:'Providence',scr:'Scranton',alb:'Albany',buf:'Buffalo'};
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.ENGINE&&process.env.ENGINE!==engine)continue;
 const browser=await type.launch(engine==='chromium'&&existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{ });
 for(const size of [{width:390,height:844},{width:375,height:667},{width:430,height:932}]){
 const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.ATLAS_URL||'http://127.0.0.1:4173/atlas-lines/');await page.locator('#start').click();
 assert.equal(await page.locator('.city').count(),10);assert.equal(await page.locator('.city-demand').count(),10);assert.equal(await page.locator('.city.unserved .connection-glow').count(),10);assert.equal(await page.locator('.card').count(),3);
 async function checkFit(label){const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,h:innerHeight,w:document.documentElement.scrollWidth,vw:innerWidth}));assert.ok(layout.w<=layout.vw,label+JSON.stringify(layout));assert.ok(layout.scroll<=layout.h+3,label+JSON.stringify(layout));const visible=await page.evaluate(()=>{const b=document.querySelector('.board').getBoundingClientRect();return [...document.querySelectorAll('.city .halo')].every(e=>{const r=e.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom})});assert.ok(visible,label+': every city dot fits');}
 await checkFit('initial');await page.screenshot({path:`test-results/${engine}-${size.width}.png`});
 const city=id=>page.locator('.city').filter({has:page.locator('.city-name',{hasText:new RegExp('^'+names[id]+'$')})});
 // Inspect a named journey, an irrelevant line, and a helpful one before spending.
 await city('dc').click();assert.match(await page.locator('#route-plan').textContent(),/Washington DC → Baltimore/);await checkFit('city selected');assert.ok(await page.locator('.city.buildable .connection-glow').count()>0);assert.equal(await page.locator('#map.connection-focus').count(),1);
 await city('buf').click();await page.locator('#cancel-route').click();await city('buf').click();await city('bal').click();assert.match(await page.locator('.route-impact').textContent(),/No extra arrivals/);await checkFit('irrelevant route preview');await page.locator('#cancel-route').click();
 await city('dc').click();await city('bal').click();assert.match(await page.locator('.route-impact').textContent(),/2 more passengers/);await checkFit('useful route preview');await page.screenshot({path:`test-results/${engine}-${size.width}-preview.png`});await page.locator('#cancel-route').click();
 await city('buf').click();await city('alb').click();await page.locator('#build').click();await city('buf').click();assert.equal(await city('har').getAttribute('data-connect-status'),'more-funds');assert.equal(await city('bos').getAttribute('data-connect-status'),'buildable');assert.equal(await city('alb').getAttribute('data-connect-status'),'existing');await page.screenshot({path:`test-results/${engine}-${size.width}-glow.png`});await page.reload();
 // One corridor build creates each real stop and never duplicates existing track.
 await city('dc').click();await city('bal').click();await page.locator('#build').click();
 await city('dc').click();await city('bos').click();
 assert.match(await page.locator('.stop-list').textContent(),/DC → Baltimore → Phila. → NYC → Hartford → Providence → Boston/);
 assert.match(await page.locator('.stop-list').textContent(),/5 new segments.*existing track reused/);
 assert.equal(await page.locator('.planned-route').count(),5);assert.equal(await page.locator('.reused-route').count(),1);await checkFit('seven-stop corridor preview');
 await page.screenshot({path:`test-results/${engine}-${size.width}-stops.png`});await page.locator('#build').click();
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().routes.length),6);assert.equal(await page.locator('.city.connected').count(),7);await page.locator('#next').click();
 assert.equal(await page.locator('.city.unserved').count(),3);await city('dc').click();assert.equal(await city('bal').getAttribute('data-connect-status'),'existing');assert.equal(await city('alb').getAttribute('data-connect-status'),'buildable');await city('bal').click();assert.equal(await page.locator('#build').isDisabled(),true);assert.match(await page.locator('.route-impact').textContent(),/tracks already exist/);await page.locator('#cancel-route').click();
 await page.reload();
 await page.locator('#forecast').click();assert.match(await page.locator('#modal').textContent(),/22.*still waiting/s);assert.match(await page.locator('#modal').textContent(),/No connected journey/);await page.locator('#close-dispatch').click();
 const pending=structuredClone(edges);
 for(let turn=1;turn<=24;turn++){
   let s=await page.evaluate(()=>window.atlas.snapshot());if(turn===18){await city('bos').click();await checkFit('crowded map connection focus');assert.ok(await page.locator('.city.buildable').count()>0);await page.screenshot({path:`test-results/${engine}-${size.width}-crowded-glow.png`});await page.locator('#clear-city').click();}
   while(s.actions&&pending.length){const construction=routePlan(s,...pending[0]);if(!construction.newSegments.length){pending.shift();continue;}if(construction.cost>s.funds)break;const [a,b]=pending.shift();await city(a).click();await city(b).click();await page.locator('#build').click();s=await page.evaluate(()=>window.atlas.snapshot());}
   const forecastText=await page.locator('#forecast').innerText(),match=forecastText.match(/(\d+) arrive · (\d+) still waiting/);assert.ok(match);
   await page.locator('#next').click();if(await page.locator('#confirm-next').isVisible())await page.locator('#confirm-next').click();
   const actual=await page.evaluate(()=>window.atlas.snapshot().lastReport);assert.equal(actual.served,+match[1]);assert.equal(actual.waiting,+match[2]);
   if(await page.locator('#skip').isVisible())await page.locator('#skip').click();
 }
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().status),'won');await page.locator('#restart').click();
 await page.locator('[data-card="1"]').click();await page.locator('#use-card').click();await city('nyc').click();assert.equal(await page.evaluate(()=>window.atlas.snapshot().cities.nyc.upgrade),1);
 await page.reload();
 for(let i=0;i<24;i++){if(await page.evaluate(()=>window.atlas.snapshot().status)!=='playing')break;await page.locator('#next').click();await page.locator('#confirm-next').click();if(await page.locator('#skip').isVisible())await page.locator('#skip').click();}
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().status),'lost');assert.deepEqual(errors,[]);console.log(`${engine} ${size.width}×${size.height}: mobile fit, multi-stop corridor, reuse, preview accuracy, complete win/loss PASS`);await page.close();
 }await browser.close();
}
