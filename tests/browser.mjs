import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const edges=[['Washington DC','Baltimore'],['Baltimore','Philadelphia'],['Philadelphia','New York'],['New York','Hartford'],['Hartford','Providence'],['Providence','Boston'],['Scranton','New York'],['Scranton','Buffalo'],['Albany','Boston'],['Albany','Buffalo'],['Boston','Hartford'],['Buffalo','Philadelphia']];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch(engine==='chromium'&&existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{ });
 for(const size of [{width:390,height:844},{width:375,height:667},{width:430,height:932}]){
 const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/atlas-lines/');await page.locator('#start').click();
 assert.equal(await page.locator('.city').count(),10);assert.equal(await page.locator('.card').count(),3);
 const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,h:innerHeight,w:document.documentElement.scrollWidth,vw:innerWidth}));assert.ok(layout.w<=layout.vw,JSON.stringify(layout));assert.ok(layout.scroll<=layout.h+3,JSON.stringify(layout));
 const visible=await page.evaluate(()=>{const b=document.querySelector('.board').getBoundingClientRect();return [...document.querySelectorAll('.city .halo')].every(e=>{const r=e.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom})});assert.ok(visible,'Every city dot must fit inside the board');
 await page.screenshot({path:`test-results/${engine}-${size.width}.png`});
 const city=n=>page.locator('.city').filter({has:page.locator('.city-name',{hasText:new RegExp('^'+n+'$')})});
 for(let turn=1;turn<=24;turn++){
   if(turn<=6)for(const [a,b]of edges.slice((turn-1)*2,turn*2)){await city(a).click();await city(b).click();await page.locator('#build').click();}
   await page.locator('#next').click();if(await page.locator('#confirm-next').isVisible())await page.locator('#confirm-next').click();if(await page.locator('#skip').isVisible())await page.locator('#skip').click();
 }
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().status),'won');await page.locator('#restart').click();
 // Test card detail and targeted card interaction.
 await page.locator('[data-card="1"]').click();await page.locator('#use-card').click();await city('New York').click();assert.equal(await page.evaluate(()=>window.atlas.snapshot().cities.nyc.upgrade),1);
 await page.reload(); // Onboarding preference persists, run resets.
 for(let i=0;i<24;i++){if(await page.evaluate(()=>window.atlas.snapshot().status)!=='playing')break;await page.locator('#next').click();await page.locator('#confirm-next').click();if(await page.locator('#skip').isVisible())await page.locator('#skip').click();}
 assert.equal(await page.evaluate(()=>window.atlas.snapshot().status),'lost');assert.deepEqual(errors,[]);console.log(`${engine} ${size.width}×${size.height}: layout, complete win/loss, cards, challenges PASS`);await page.close();
 }await browser.close();
}
