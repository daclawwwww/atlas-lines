import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const edges=[['dc','bal'],['bal','phi'],['phi','nyc'],['nyc','bos'],['har','bos'],['pro','bos'],['scr','nyc'],['alb','nyc'],['buf','alb'],['nyc','har'],['nyc','pro'],['scr','alb'],['buf','scr'],['bal','nyc'],['dc','phi']];
const names={dc:'Washington DC',bal:'Baltimore',phi:'Philadelphia',nyc:'New York',bos:'Boston',har:'Hartford',pro:'Providence',scr:'Scranton',alb:'Albany',buf:'Buffalo'};
function cost(s,a,b){const c={dc:[38.91,-77.04],bal:[39.29,-76.61],phi:[39.95,-75.17],nyc:[40.71,-74.01],bos:[42.36,-71.06],har:[41.76,-72.67],pro:[41.82,-71.41],scr:[41.41,-75.66],alb:[42.65,-73.75],buf:[42.89,-78.87]};return Math.max(2,Math.ceil(Math.hypot((c[a][0]-c[b][0])*111,(c[a][1]-c[b][1])*82)/65)+2-s.discount);}
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.ENGINE&&process.env.ENGINE!==engine)continue;
 const browser=await type.launch(engine==='chromium'&&existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{ });
 for(const size of [{width:390,height:844},{width:375,height:667},{width:430,height:932}]){
 const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.ATLAS_URL||'http://127.0.0.1:4173/atlas-lines/');await page.locator('#start').click();
 assert.equal(await page.locator('.city').count(),10);assert.equal(await page.locator('.city-demand').count(),10);assert.equal(await page.locator('.card').count(),3);
 async function checkFit(label){const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,h:innerHeight,w:document.documentElement.scrollWidth,vw:innerWidth}));assert.ok(layout.w<=layout.vw,label+JSON.stringify(layout));assert.ok(layout.scroll<=layout.h+3,label+JSON.stringify(layout));const visible=await page.evaluate(()=>{const b=document.querySelector('.board').getBoundingClientRect();return [...document.querySelectorAll('.city .halo')].every(e=>{const r=e.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom})});assert.ok(visible,label+': every city dot fits');}
 await checkFit('initial');await page.screenshot({path:`test-results/${engine}-${size.width}.png`});
 const city=id=>page.locator('.city').filter({has:page.locator('.city-name',{hasText:new RegExp('^'+names[id]+'$')})});
 // Inspect a named journey, an irrelevant line, and a helpful one before spending.
 await city('dc').click();assert.match(await page.locator('#route-plan').textContent(),/Washington DC → Baltimore/);await checkFit('city selected');
 await city('buf').click();assert.match(await page.locator('.route-impact').textContent(),/No extra arrivals/);await checkFit('irrelevant route preview');await page.locator('#cancel-route').click();
 await city('dc').click();await city('bal').click();assert.match(await page.locator('.route-impact').textContent(),/2 more passengers/);await checkFit('useful route preview');await page.screenshot({path:`test-results/${engine}-${size.width}-preview.png`});await page.locator('#cancel-route').click();
 await page.locator('#forecast').click();assert.match(await page.locator('#modal').textContent(),/22.*still waiting/s);assert.match(await page.locator('#modal').textContent(),/No connected journey/);await page.locator('#close-dispatch').click();
 const pending=structuredClone(edges);
 for(let turn=1;turn<=24;turn++){
   let s=await page.evaluate(()=>window.atlas.snapshot());
   while(s.actions&&pending.length&&cost(s,...pending[0])<=s.funds){const [a,b]=pending.shift();await city(a).click();await city(b).click();await page.locator('#build').click();s=await page.evaluate(()=>window.atlas.snapshot());}
   const forecastText=await page.locator('#forecast').innerText(),match=forecastText.match(/(\d+) arrive · (\d+) still waiting/);assert.ok(match);
   await page.locator('#next').click();if(await page.locator('#confirm-next').isVisible())await page.locator('#confirm-next').click();
   const actual=await page.evaluate(()=>window.atlas.snapshot().lastReport);assert.equal(actual.served,+match[1]);assert.equal(actual.waiting,+match[2]);
   if(await page.locator('#skip').isVisible())await page.locator('#skip').click();
 }
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().status),'won');await page.locator('#restart').click();
 await page.locator('[data-card="1"]').click();await page.locator('#use-card').click();await city('nyc').click();assert.equal(await page.evaluate(()=>window.atlas.snapshot().cities.nyc.upgrade),1);
 await page.reload();
 for(let i=0;i<24;i++){if(await page.evaluate(()=>window.atlas.snapshot().status)!=='playing')break;await page.locator('#next').click();await page.locator('#confirm-next').click();if(await page.locator('#skip').isVisible())await page.locator('#skip').click();}
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().status),'lost');assert.deepEqual(errors,[]);console.log(`${engine} ${size.width}×${size.height}: mobile fit, journeys, preview accuracy, complete win/loss, cards PASS`);await page.close();
 }await browser.close();
}
