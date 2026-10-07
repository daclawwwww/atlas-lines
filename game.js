export const CITIES = [
{id:'buf',name:'Buffalo',x:66,y:119,lat:42.89,lon:-78.87},{id:'alb',name:'Albany',x:222,y:143,lat:42.65,lon:-73.75},{id:'bos',name:'Boston',x:337,y:183,lat:42.36,lon:-71.06},{id:'scr',name:'Scranton',x:145,y:257,lat:41.41,lon:-75.66},{id:'har',name:'Hartford',x:259,y:231,lat:41.76,lon:-72.67},{id:'pro',name:'Providence',x:331,y:264,lat:41.82,lon:-71.41},{id:'nyc',name:'New York',x:237,y:328,lat:40.71,lon:-74.01},{id:'phi',name:'Philadelphia',x:171,y:398,lat:39.95,lon:-75.17},{id:'bal',name:'Baltimore',x:117,y:470,lat:39.29,lon:-76.61},{id:'dc',name:'Washington DC',x:76,y:529,lat:38.91,lon:-77.04}];
export const CARDS={grant:{name:'Rail Grant',icon:'▤',tag:'PUBLIC WORKS',description:'Your next route costs 4 less. Every stop on its new track gains 2 waiting passengers.',target:'none'},station:{name:'Station Upgrade',icon:'⌂',tag:'INFRASTRUCTURE',description:'Pay 4 funds: a station handles 6 more passengers, including transfers. Attracts +1 passenger each season.',target:'city'},express:{name:'Express Line',icon:'➟',tag:'OPERATIONS',description:'Pay 3 funds: one track segment carries 4 more passengers each season. Costs 1 fund each season.',target:'route'},boom:{name:'Boom Town',icon:'✦',tag:'DEVELOPMENT',description:'One city earns +2 funds each season, but adds +2 demand. Connect it first!',target:'city'},survey:{name:'Survey Crew',icon:'⌖',tag:'PLANNING',description:'Your next route costs 2 less and carries 2 extra passengers each season. Uses an action.',target:'none'},bonds:{name:'Civic Bonds',icon:'◈',tag:'FINANCE',description:'Receive 8 funds now. Repay 2 each season for the next 5 seasons.',target:'none'}};
const deck=['grant','station','bonds','express','boom','survey'];
export const CHALLENGES=[
{type:'GEOGRAPHY',question:'Which of these cities lies farthest west?',answers:['Buffalo','Albany','Scranton'],correct:0,fact:'Buffalo sits on Lake Erie, at the western edge of New York.'},
{type:'HISTORICAL GEOGRAPHY',question:'Which city was the U.S. capital from 1790 to 1800?',answers:['Boston','Philadelphia','Baltimore'],correct:1,fact:'Philadelphia served as the capital before the government moved to Washington.'},
{type:'WORD PUZZLE',question:'Unscramble “NOSTOB” to find a city on your map.',answers:['Boston','Buffalo','Albany'],correct:0,fact:'Boston! A coastal hub with a long history of trade and rail travel.'},
{type:'CAPITALS & CITIES',question:'What is the capital of New York State?',answers:['New York City','Buffalo','Albany'],correct:2,fact:'Albany has been New York’s state capital since 1797.'},
{type:'HISTORY',question:'The Declaration of Independence was adopted in which city?',answers:['Washington DC','Philadelphia','Providence'],correct:1,fact:'The Continental Congress adopted it in Philadelphia on July 4, 1776.'},
{type:'GEOGRAPHY',question:'Which bay meets the Atlantic near Baltimore?',answers:['Chesapeake Bay','San Francisco Bay','Hudson Bay'],correct:0,fact:'Baltimore’s harbor connects to the Chesapeake Bay via the Patapsco River.'}];
// Each origin has a destination. Transfers must use connected rail lines.
export const DESTINATIONS={buf:'alb',alb:'nyc',bos:'nyc',scr:'nyc',har:'bos',pro:'bos',nyc:'bos',phi:'nyc',bal:'phi',dc:'bal'};
export const QUEUE_LIMIT=160;
export function createGame(seed=1920){
 const s={version:3,seed,turn:1,actions:2,funds:18,score:0,congestion:0,routes:[],cities:Object.fromEntries(CITIES.map(c=>[c.id,{queue:0,level:0,upgrade:0,boom:false}])),tickets:CITIES.map(c=>({from:c.id,to:DESTINATIONS[c.id],count:1,born:0})),hand:['grant','station','bonds'],draw:3,discount:0,survey:false,debt:0,status:'playing',challenge:null,challengeDone:0,lastReport:null,totalServed:0};syncQueues(s);return s;
}
export function distance(a,b){const A=CITIES.find(c=>c.id===a),B=CITIES.find(c=>c.id===b);return A&&B?Math.hypot((A.lon-B.lon)*82,(A.lat-B.lat)*111):Infinity;}
// Stop detection uses the same illustrated coordinates as the board, so what
// passes along a city on the map becomes a real station in the network.
export function routeStops(a,b){
 const A=CITIES.find(c=>c.id===a),B=CITIES.find(c=>c.id===b);if(!A||!B||a===b)return [];
 // Resolve in a canonical direction so reversing a selection is identical.
 if(CITIES.indexOf(A)>CITIES.indexOf(B))return routeStops(b,a).reverse();
 const dx=B.x-A.x,dy=B.y-A.y,length2=dx*dx+dy*dy;
 const intermediate=CITIES.filter(c=>c.id!==a&&c.id!==b).map(c=>{const t=((c.x-A.x)*dx+(c.y-A.y)*dy)/length2;return {id:c.id,t,offset:Math.hypot(c.x-A.x-t*dx,c.y-A.y-t*dy)};}).filter(c=>c.t>0&&c.t<1&&c.offset<=45).sort((c,d)=>c.t-d.t).map(c=>c.id);
 return [a,...intermediate,b];
}
export function routePlan(s,a,b){
 const stops=routeStops(a,b),segments=stops.slice(1).map((id,i)=>({a:stops[i],b:id,existing:s.routes.some(r=>(r.a===stops[i]&&r.b===id)||(r.b===stops[i]&&r.a===id))}));
 const newSegments=segments.filter(r=>!r.existing),km=newSegments.reduce((n,r)=>n+distance(r.a,r.b),0);
 return {stops,segments,newSegments,cost:newSegments.length?Math.max(2,Math.ceil(km/65)+2-s.discount):0};
}
export function routeCost(s,a,b){return routeStops(a,b).length?routePlan(s,a,b).cost:Infinity;}
export function capacity(s,id){return 12+s.cities[id].upgrade*6;}
export function demand(s,id){return 1+(id==='nyc'||id==='bos'?1:0)+Math.floor((s.turn-1)/8)+Math.floor(s.cities[id].level/2)+s.cities[id].upgrade+(s.cities[id].boom?2:0);}
export function findPath(s,from,to,remaining=null,stations=null){
 if(from===to)return {cities:[from],routes:[]};
 // Dijkstra: passengers board and transfer at real stops; full tracks/stations are excluded.
 const dist={[from]:0},previous={},todo=new Set(Object.keys(s.cities));
 while(todo.size){let id=null;for(const candidate of todo)if(dist[candidate]!==undefined&&(id===null||dist[candidate]<dist[id]))id=candidate;if(id===null)break;todo.delete(id);if(id===to){const cities=[to],routes=[];while(cities[0]!==from){const p=previous[cities[0]];routes.unshift(p.route);cities.unshift(p.city);}return {cities,routes};}
 if(stations&&stations[id]<=0)continue;
 s.routes.forEach((r,i)=>{if(remaining&&remaining[i]<=0)return;const next=r.a===id?r.b:r.b===id?r.a:null;if(!next||!todo.has(next)||(stations&&stations[next]<=0))return;const d=dist[id]+distance(id,next);if(dist[next]===undefined||d<dist[next]){dist[next]=d;previous[next]={city:id,route:i};}});
 }return null;
}
function syncQueues(s){for(const c of Object.values(s.cities))c.queue=0;for(const t of s.tickets)s.cities[t.from].queue+=t.count;s.congestion=Math.min(100,Math.round(s.tickets.reduce((n,t)=>n+t.count,0)/QUEUE_LIMIT*100));}
function addTickets(s,id,count){s.tickets.push({from:id,to:DESTINATIONS[id],count,born:s.turn});}
function available(s){return s.status==='playing'&&s.challenge===null&&s.actions>0;}
export function buildRoute(s,a,b){
 if(!available(s))return 'No actions left. End the season for two more.';
 if(!s.cities[a]||!s.cities[b]||a===b)return 'Choose two different cities.';
 const plan=routePlan(s,a,b);
 if(!plan.newSegments.length)return 'All these tracks already exist. Select a segment for Express Line, or extend to another city.';
 if(s.funds<plan.cost)return `You need ${plan.cost} funds for this route.`;
 s.funds-=plan.cost;s.actions--;
 for(const segment of plan.newSegments)s.routes.push({a:segment.a,b:segment.b,capacity:6+(s.survey?2:0),express:false});
 // A grant attracts riders at every newly served station, not just endpoints.
 if(s.discount===4){const stations=new Set(plan.newSegments.flatMap(r=>[r.a,r.b]));for(const id of stations)addTickets(s,id,2);}
 s.discount=0;s.survey=false;syncQueues(s);return null;
}
export function playCard(s,index,target){if(!available(s))return 'No actions left. End the season for two more.';const key=s.hand[index],card=CARDS[key];if(!card)return 'Card unavailable.';if(card.target==='city'&&!s.cities[target])return 'Choose a city on the map.';if(key==='station'&&s.funds<4)return 'Station upgrade needs 4 funds.';if(key==='express'){const r=s.routes[target];if(!r)return 'Choose an existing rail route.';if(r.express)return 'This line is already express.';if(s.funds<3)return 'Express service needs 3 funds.';r.capacity+=4;r.express=true;s.funds-=3;}
 if(key==='grant'||key==='survey'){if(s.discount)return 'Build your discounted route first.';s.discount=key==='grant'?4:2;s.survey=key==='survey';}
 if(key==='station'){s.funds-=4;s.cities[target].upgrade++;}
 if(key==='boom'){if(s.cities[target].boom)return 'This city is already booming.';s.cities[target].boom=true;}
 if(key==='bonds'){if(s.debt)return 'Repay your current bonds first.';s.funds+=8;s.debt=5;}
 s.actions--;s.hand[index]=deck[(s.draw++ + s.seed%6)%deck.length];return null;
}
// This is the single source for the actual turn AND every UI forecast.
function runService(s){
 for(const c of CITIES)addTickets(s,c.id,demand(s,c.id));
 const lineRemaining=s.routes.map(r=>r.capacity),stationRemaining=Object.fromEntries(CITIES.map(c=>[c.id,capacity(s,c.id)])),byCity=Object.fromEntries(CITIES.map(c=>[c.id,0]));
 const deliveries=[];let served=0;
 // Oldest passengers first, round-robin among origins of the same age.
 const sorted=[...s.tickets].sort((a,b)=>a.born-b.born);let progress=true;
 while(progress){progress=false;for(const t of sorted){if(!t.count)continue;const path=findPath(s,t.from,t.to,lineRemaining,stationRemaining);if(!path)continue;t.count--;served++;byCity[t.from]++;for(const i of path.routes)lineRemaining[i]--;for(const id of path.cities)stationRemaining[id]--;const trip=deliveries.find(d=>d.from===t.from&&d.to===t.to&&d.path.join()===path.cities.join());if(trip)trip.count++;else deliveries.push({from:t.from,to:t.to,count:1,path:path.cities});progress=true;}}
 s.tickets=s.tickets.filter(t=>t.count);syncQueues(s);
 const missing=Object.fromEntries(CITIES.map(c=>[c.id,findPath(s,c.id,DESTINATIONS[c.id])===null]));
 const disconnected=s.tickets.filter(t=>!findPath(s,t.from,t.to)).reduce((n,t)=>n+t.count,0),waiting=s.tickets.reduce((n,t)=>n+t.count,0);
 const fares=Math.floor(served/3),boomIncome=CITIES.reduce((n,c)=>n+(s.cities[c.id].boom&&byCity[c.id]>0?2:0),0),upkeep=Math.floor(s.routes.length/4)+s.routes.filter(r=>r.express).length+(s.debt?2:0);
 const income=3+fares+boomIncome-upkeep;
 const report={turn:s.turn,served,waiting,congestion:s.congestion,income,fares,boomIncome,upkeep,baseIncome:3,byCity,deliveries,disconnected,capacityBlocked:waiting-disconnected,missing,lineUsed:s.routes.map((r,i)=>r.capacity-lineRemaining[i]),stationUsed:Object.fromEntries(CITIES.map(c=>[c.id,capacity(s,c.id)-stationRemaining[c.id]])),arrivalCount:CITIES.reduce((n,c)=>n+demand(s,c.id),0),cityQueues:Object.fromEntries(CITIES.map(c=>[c.id,s.cities[c.id].queue]))};return report;
}
export function forecast(s){return runService(structuredClone(s));}
export function routeImpact(s,a,b){const before=forecast(s),copy=structuredClone(s);copy.actions=Math.max(1,copy.actions);copy.challenge=null;const error=buildRoute(copy,a,b);if(error)return {error,before,after:null};const after=forecast(copy);return {before,after,extraServed:after.served-before.served,queueChange:after.waiting-before.waiting,newConnections:CITIES.filter(c=>before.missing[c.id]&&!after.missing[c.id]).map(c=>c.id)};}
export function endTurn(s){if(s.status!=='playing'||s.challenge!==null)return false;const report=runService(s);s.lastReport=report;s.funds+=report.income;s.score+=report.served*5;s.totalServed+=report.served;if(s.debt)s.debt--;for(const c of CITIES)if(report.byCity[c.id])s.cities[c.id].level=Math.min(3,s.cities[c.id].level+0.2);
 if(s.congestion>=100||report.waiting>=QUEUE_LIMIT)s.status='lost';else if(s.funds<0)s.status='bankrupt';else if(s.turn===24)s.status='won';else{s.turn++;s.actions=2;if((s.turn-1)%4===0)s.challenge=Math.floor((s.turn-1)/4)-1;}return true;
}
export function answerChallenge(s,answer){if(s.challenge===null)return null;const q=CHALLENGES[s.challenge],correct=answer===q.correct;if(correct){s.funds+=4;for(const c of CITIES){const ticket=s.tickets.find(t=>t.from===c.id&&t.count>0);if(ticket)ticket.count--;}s.tickets=s.tickets.filter(t=>t.count>0);syncQueues(s);}s.challenge=null;s.challengeDone++;return {correct,fact:q.fact};}
