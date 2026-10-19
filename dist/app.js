import {PLACES,RESTAURANTS,useMenu,FOOD_STEPS,RIDE_STEPS,money,escapeHTML as esc,place,restaurant,validPoint,samePoint,mapsURL,foodTotals,rideFare,findRoute,nextStep} from './core.js';
import {ROUTES} from './routes.js';
import {fetchMenu} from './menu.js';
import {SUPABASE} from './config.js';

const app=document.getElementById('app');
const state={screen:'home',restaurantId:'kitchen',cartRestaurant:null,cart:{},filter:'All',search:'',payment:'Wave',delivery:{...place('senegambia')},landmark:'Near the main road',notes:'',from:{...place('brusubi')},to:{...place('senegambia')},pinMode:'to',pickupNote:'',jobs:[],selectedJob:null,sequence:1,menuSource:'demo'};
let map=null,toastTimer=null;
const route=(a,b)=>findRoute(ROUTES,a,b);
const btn=(text,action,cls='primary',extra='')=>`<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;
const back=(action,text='Back')=>`<button type="button" class="back" data-action="${action}">${text}</button>`;
const priceRow=(label,value,total=false)=>`<div class="cost-row${total?' total':''}"><span>${label}</span><span class="price">${money(value)}</span></div>`;
const errorArea=()=>'<p id="form-error" class="error" role="alert"></p>';
const totals=()=>foodTotals(state.cartRestaurant,state.cart);
const options=selected=>PLACES.map(p=>`<option value="${p.id}"${selected?.id===p.id?' selected':''}>${esc(p.name)}</option>`).join('')+(!selected?.id?`<option value="custom" selected>${esc(selected?.name||'Map pin')}</option>`:'');
const locationSelect=(id,label,value)=>`<label class="label" for="${id}">${label}</label><select id="${id}">${options(value)}</select>`;
const payment=()=>`<fieldset><legend>Payment method · demo selection</legend><div class="payment-options">${['Wave','Cash'].map(p=>`<label class="payment-option"><input type="radio" name="payment" value="${p}"${state.payment===p?' checked':''}>${p}</label>`).join('')}</div></fieldset>`;
const googleLink=(a,b)=>`<a class="btn secondary full" href="${esc(mapsURL(a,b))}" target="_blank" rel="noopener">Open route in Google Maps</a>`;
function endpoints(a,b){return `<div class="route-line"><span class="route-letter">A</span><p>${esc(a.name)}<small>Pickup</small></p></div><div class="route-line"><span class="route-letter">B</span><p>${esc(b.name)}<small>Destination</small></p></div>`;}
function mapSection(a,b,editable=false,food=false){
  const r=route(a,b),same=samePoint(a,b);
  return `${editable&&!food?'<label class="label" for="pin-mode">Tap the map to change</label><select id="pin-mode"><option value="to"'+(state.pinMode==='to'?' selected':'')+'>Destination pin (B)</option><option value="from"'+(state.pinMode==='from'?' selected':'')+'>Pickup pin (A)</option></select>':''}<div id="route-map" class="map" role="region" aria-label="${food?'Food delivery':'Taxi'} route map"></div><p id="map-note" class="map-hint">${editable?(food?'Tap the map to move your delivery pin. ':'Tap the map or drag a pin to change the route. '):''}${r?'Blue line: saved road-route preview.':same?'Both locations are in the same sample area.':'Custom route: open Google Maps for driving directions.'}</p>${r?`<div class="map-info"><div><strong>${(r.distance/1000).toFixed(1)} km</strong><small>Sample road distance</small></div><div><strong>About ${Math.max(1,Math.round(r.duration/60))} min</strong><small>Driving only · no traffic</small></div></div>`:''}${googleLink(a,b)}<p class="notice section-gap">${food?'Restaurant pins are fictional demo pickup areas. ':''}Sample routes saved 8 Oct 2026. Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>; routing by <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a>. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Fix the map</a>.</p>`;
}
function toast(text){const box=document.getElementById('toast');clearTimeout(toastTimer);box.textContent=text;box.hidden=false;toastTimer=setTimeout(()=>box.hidden=true,2200);}
function showError(text){const box=document.getElementById('form-error');if(box){box.textContent=text;box.scrollIntoView?.({block:'nearest'});}else toast(text);}
function go(screen){state.screen=screen;render();window.scrollTo?.({top:0,behavior:'instant'});}
function home(){
  const active=state.jobs.find(j=>!j.cancelled&&j.step<4);
  return `<p class="eyebrow">The Gambia · Explore the demo</p><h1>A good day starts<br>with less hassle.</h1><p class="muted">What can we help you with?</p><div class="service-grid"><button class="service-tile" data-action="food"><span class="emoji" aria-hidden="true">🍲</span><strong>Food</strong><small>Your favourite meals</small></button><button class="service-tile" data-action="ride"><span class="emoji" aria-hidden="true">🚕</span><strong>Ride</strong><small>Get where you need</small></button></div>${active?`<button class="activity-card" data-action="job" data-id="${active.id}"><strong>Continue your demo ${active.type==='food'?'order':'ride'}</strong><small>${esc(jobStatus(active))}</small></button>`:''}<div class="panel"><h3>Simple from the first tap.</h3><p class="small muted">Explore menus, check a route, and see the full price before you confirm.</p></div><p class="notice">Try the full experience with sample restaurants and prices. No account or payment is needed.</p>${totals().count?basketBar():''}`;
}
function restaurantCards(){
  const q=state.search.trim().toLowerCase();
  const list=RESTAURANTS.filter(r=>(state.filter==='All'||r.category===state.filter)&&(`${r.name} ${r.tag} ${r.items.map(i=>i.name+' '+i.description).join(' ')}`.toLowerCase().includes(q)));
  return list.length?list.map(r=>`<button class="restaurant-card" data-action="restaurant" data-id="${r.id}"><span class="restaurant-icon" aria-hidden="true">${r.emoji}</span><span><strong>${esc(r.name)}</strong><small>${esc(r.tag)}</small><small>${esc(place(r.area).name)} · Sample restaurant</small></span></button>`).join(''):'<div class="panel"><p>No sample restaurants match. Try another search or choose All.</p></div>';
}
function food(){return `${back('home','Home')}<h1>A taste of home.</h1><p class="muted">Choose a sample restaurant.</p><img class="banner-photo" src="./assets/sample-meal.webp" width="960" height="640" alt="Illustrative plate of rice, chicken and vegetables on a blue table"><p class="image-note">Illustrative food image · restaurants and prices are examples</p><label class="label" for="food-search">Find a restaurant or meal</label><input id="food-search" type="search" maxlength="80" placeholder="Try rice, fish or vegetables" value="${esc(state.search)}"><div class="chip-row">${['All','Local','Grill','Vegetarian'].map(c=>`<button class="chip" data-action="filter" data-value="${c}" aria-pressed="${state.filter===c}">${c}</button>`).join('')}</div><div id="restaurants" class="stack">${restaurantCards()}</div>${basketBar()}`;}
function stepper(item,rid){const quantity=state.cartRestaurant===rid?(state.cart[item.id]||0):0;return `<div class="stepper" aria-label="Quantity for ${esc(item.name)}"><button type="button" data-action="quantity" data-id="${item.id}" data-restaurant="${rid}" data-delta="-1" aria-label="Remove one ${esc(item.name)}"${quantity===0?' disabled':''}>−</button><output aria-label="Quantity">${quantity}</output><button type="button" data-action="quantity" data-id="${item.id}" data-restaurant="${rid}" data-delta="1" aria-label="Add one ${esc(item.name)}"${quantity>=20?' disabled':''}>+</button></div>`;}
function menu(){const r=restaurant(state.restaurantId);return `${back('food','Restaurants')}<p class="eyebrow">${esc(place(r.area).name)} · Sample restaurant</p><h1>${esc(r.name)}</h1><p class="muted">${esc(r.tag)}</p><p class="notice">${state.menuSource==="database"?"Menu and prices from the RideApp test database.":"Example menu and prices."} Delivery is ${money(r.delivery??50)} per demo order.</p>${r.items.map(i=>`<article class="menu-item"><div><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><span class="price">${money(i.price)}</span></div>${stepper(i,r.id)}</article>`).join('')}${basketBar()}`;}
function basketBar(){const t=totals();return t.count?`<div class="basket-bar"><button class="btn primary" data-action="cart"><span>View basket (${t.count})</span><span>${money(t.subtotal)}</span></button></div>`:'';}
function cart(){const t=totals();if(!t.count)return `${back('food','Restaurants')}<div class="empty"><span class="emoji" aria-hidden="true">🍲</span><h1>Your basket is empty.</h1><p class="muted">Choose a meal to get started.</p>${btn('Explore food','food')}</div>`;const r=restaurant(state.cartRestaurant);return `${back('menu','Back to menu')}<h1>Your basket.</h1><p class="muted">${esc(r.name)} · Sample order</p>${t.lines.map(i=>`<article class="menu-item"><div><h3>${esc(i.name)}</h3><p>${money(i.price)} each</p><span class="price">${money(i.total)}</span></div>${stepper(i,r.id)}</article>`).join('')}<div class="section-gap">${priceRow('Meals',t.subtotal)}${priceRow('Example delivery fee',t.delivery)}${priceRow('Total',t.total,true)}</div>${btn('Continue to delivery','delivery','primary full')}<p class="notice section-gap">One restaurant per basket. No hidden service charge in this demo.</p>`;}
function delivery(){const r=restaurant(state.cartRestaurant);return `${back('cart','Basket')}<h1>Where should it go?</h1><p class="muted">Choose an example delivery location.</p>${locationSelect('delivery-area','Delivery area',state.delivery)}<label class="label" for="landmark">Landmark or delivery instructions</label><input id="landmark" maxlength="160" value="${esc(state.landmark)}" placeholder="For example, near the roundabout"><label class="label" for="food-notes">Meal notes (optional)</label><textarea id="food-notes" maxlength="200" placeholder="Any notes for this sample order?">${esc(state.notes)}</textarea>${btn('Use my location','gps-delivery','secondary full')}${mapSection(place(r.area),state.delivery,true,true)}${btn('Review order','review-food','primary full')}${errorArea()}`;}
function foodReview(){const t=totals(),r=restaurant(state.cartRestaurant);return `${back('delivery','Delivery details')}<h1>Your order.</h1><div class="panel"><h3>${esc(r.name)}</h3>${t.lines.map(i=>`<div class="cost-row"><span>${i.quantity} × ${esc(i.name)}</span><span>${money(i.total)}</span></div>`).join('')}</div><div class="panel"><h3>Delivery to ${esc(state.delivery.name)}</h3><p class="small muted">${esc(state.landmark)}</p>${state.notes?`<p class="small">Meal notes: ${esc(state.notes)}</p>`:''}</div>${payment()}${priceRow('Meals',t.subtotal)}${priceRow('Example delivery fee',t.delivery)}${priceRow('Total',t.total,true)}${btn('Place demo order','place-food','primary full')}<p class="notice section-gap">No money will be charged. No restaurant or courier receives this order.</p>${errorArea()}`;}
function ride(){const r=route(state.from,state.to);return `${back('home','Home')}<h1>Where to?</h1><p class="muted">Choose sample areas, or place your own pins.</p>${locationSelect('ride-from','Pickup',state.from)}<div class="split-controls"><div>${locationSelect('ride-to','Destination',state.to)}</div>${btn('Swap','swap','secondary compact')}</div><div class="row flex-wrap section-gap">${btn('Use my location','gps-ride','secondary compact')}<span class="small muted">Pickup pin A · destination B</span></div>${mapSection(state.from,state.to,true)}<div class="panel row"><div><h3>Standard ride</h3><span class="small muted">Demo vehicle · up to 4 people</span></div><span class="trip-price">${money(rideFare(r))}</span></div><p class="notice">Example fare${r?' based on the saved route':' only; custom route not priced'}. No live traffic or driver availability.</p><label class="label" for="pickup-note">Pickup landmark (optional)</label><input id="pickup-note" maxlength="160" value="${esc(state.pickupNote)}" placeholder="Help the driver find the meeting point">${btn('Review demo ride','review-ride','primary full')}${errorArea()}`;}
function rideReview(){const r=route(state.from,state.to);return `${back('ride','Edit route')}<h1>Your ride.</h1><div class="panel">${endpoints(state.from,state.to)}${state.pickupNote?`<p class="small muted">Pickup note: ${esc(state.pickupNote)}</p>`:''}</div><p class="muted">Standard ride · up to 4 people</p>${payment()}${priceRow('Example ride fare',rideFare(r))}${priceRow('Total',rideFare(r),true)}<p class="notice section-gap">${r?'Demo rate: D 75 + D 20/km, rounded up to D 5; minimum D 150.':'Custom locations use a flat D 200 example price, not a route quote.'}</p>${btn('Request demo ride','place-ride','primary full')}<p class="notice section-gap">No taxi is dispatched and no payment is made.</p>${googleLink(state.from,state.to)}${errorArea()}`;}
function jobStatus(job){return job.cancelled?'Cancelled in demo':(job.type==='food'?FOOD_STEPS:RIDE_STEPS)[job.step];}
function activity(){return `<h1>Your activity.</h1><p class="muted">Demo orders and rides from this visit.</p>${state.jobs.length?`<div class="stack">${state.jobs.map(j=>`<button class="activity-card" data-action="job" data-id="${j.id}"><div class="row"><strong>${j.type==='food'?'🍲 '+esc(j.restaurantName):'🚕 Standard ride'}</strong><span class="price">${money(j.total)}</span></div><small>${esc(jobStatus(j))}</small><small>${esc(j.from.name)} to ${esc(j.to.name)}</small></button>`).join('')}</div><p class="notice section-gap">This history is temporary and resets when you reload the page.</p>`:`<div class="empty"><span class="emoji" aria-hidden="true">☷</span><h2>Nothing here yet.</h2><p class="muted">Try a food order or a ride. You’ll see its demo progress here.</p>${btn('Explore the demo','home')}</div>`}`;}
function status(){const j=state.jobs.find(j=>j.id===state.selectedJob);if(!j)return activity();const steps=j.type==='food'?FOOD_STEPS:RIDE_STEPS;const complete=j.step===4;return `${back('activity','Activity')}<p class="eyebrow">${esc(j.id)} · Simulation</p><h1>${esc(jobStatus(j))}.</h1><p class="muted">${j.cancelled?'This demo request has been cancelled.':complete?'You have completed this demo journey.':'Use the button below to move through the demo.'}</p>${j.type==='ride'&&j.step>=1&&!j.cancelled?'<div class="panel"><h3>Demo driver</h3><p class="small muted">Example car · no real driver is assigned</p></div>':''}<div class="panel">${endpoints(j.from,j.to)}</div>${!j.cancelled?`<ol class="status-list">${steps.map((s,i)=>`<li class="${i<j.step?'done':i===j.step?'current':''}"><span class="step-dot">${i<j.step?'✓':i+1}</span><span><strong>${s}</strong>${i===j.step?'<small>Current demo step</small>':''}</span></li>`).join('')}</ol>`:''}${!complete&&!j.cancelled?btn('Next demo step','advance','primary full'):btn('Try something else','home','primary full')}${!complete&&!j.cancelled?'<button class="text-button cancel" data-action="cancel">Cancel demo request</button>':''}${mapSection(j.from,j.to)}<div class="panel"><h3>Example receipt</h3>${j.lines?j.lines.map(i=>priceRow(`${i.quantity} × ${esc(i.name)}`,i.total)).join('')+priceRow('Example delivery fee',j.deliveryFee):priceRow('Example ride fare',j.total)}${priceRow('Total',j.total,true)}<p class="notice section-gap">${esc(j.payment)} selected. No money was charged${j.payment==='Cash'?' and no cash is due':''}.</p></div>`;}

function render(){
  if(map){map.remove();map=null;}
  if(['delivery','food-review'].includes(state.screen)&&!totals().count)state.screen='cart';
  const views={home,food,menu,cart,delivery,'food-review':foodReview,ride,'ride-review':rideReview,activity,status};
  app.innerHTML=(views[state.screen]||home)();
  const current=['menu','cart','delivery','food-review'].includes(state.screen)?'food':state.screen==='ride-review'?'ride':state.screen==='status'?'activity':state.screen;
  for(const nav of document.querySelectorAll('.bottom-nav [data-action]')){if(nav.dataset.action===current)nav.setAttribute('aria-current','page');else nav.removeAttribute('aria-current');}
  const count=document.getElementById('activity-count');count.hidden=!state.jobs.length;count.textContent=String(state.jobs.length);
  if(state.screen==='ride')mountMap(state.from,state.to,true,false);
  if(state.screen==='delivery')mountMap(place(restaurant(state.cartRestaurant).area),state.delivery,true,true);
  if(state.screen==='status'){const j=state.jobs.find(j=>j.id===state.selectedJob);if(j)mountMap(j.from,j.to,false,false);}
}
function mountMap(a,b,editable,foodMode){
  const el=document.getElementById('route-map');if(!el)return;
  if(!window.L){el.innerHTML='<p class="map-error">Map unavailable. Use the Google Maps button below.</p>';return;}
  try{
    map=L.map(el,{scrollWheelZoom:false,zoomControl:true});
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
    let errors=0;tiles.on('tileerror',()=>{if(++errors>=3){const note=document.getElementById('map-note');if(note)note.textContent='Some map tiles could not load. You can still open this route in Google Maps.';}});tiles.addTo(map);
    for(const [point,key,letter] of [[a,'from','A'],[b,'to','B']]){
      const icon=L.divIcon({className:'map-marker '+(key==='to'?'destination':''),html:`<span>${letter}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
      const marker=L.marker([point.lat,point.lng],{icon,draggable:editable&&(!foodMode||key==='to'),title:`${letter}: ${point.name}`}).addTo(map);
      marker.bindTooltip(`${letter}: ${esc(point.name)}`);
      if(editable&&(!foodMode||key==='to'))marker.on('dragend',()=>setPin(marker.getLatLng(),key,foodMode));
    }
    const r=route(a,b);
    if(r){const line=L.geoJSON(r.geometry,{style:{color:'#1f56b4',weight:5,opacity:.9}}).addTo(map);map.fitBounds(line.getBounds(),{padding:[28,28],maxZoom:15});}
    else if(samePoint(a,b))map.setView([a.lat,a.lng],14);
    else map.fitBounds([[a.lat,a.lng],[b.lat,b.lng]],{padding:[32,32],maxZoom:15});
    if(editable)map.on('click',event=>setPin(event.latlng,foodMode?'to':state.pinMode,foodMode));
    const currentMap=map;requestAnimationFrame(()=>{if(map===currentMap)currentMap.invalidateSize();});
  }catch{if(map){try{map.remove();}catch{}map=null;}el.innerHTML='<p class="map-error">Map unavailable. Use the Google Maps button below.</p>';}
}
function setPin(point,key,foodMode){const p={id:null,name:foodMode?'Delivery map pin':key==='from'?'Pickup map pin':'Destination map pin',lat:Number(point.lat.toFixed(6)),lng:Number(point.lng.toFixed(6))};if(!validPoint(p))return;if(foodMode)state.delivery=p;else state[key]=p;render();toast('Pin updated. Open Google Maps for this custom route.');}
function geolocate(foodMode){
  if(!navigator.geolocation){showError('Your browser cannot provide a location. Choose an area or tap the map.');return;}
  const button=document.querySelector(`[data-action="${foodMode?'gps-delivery':'gps-ride'}"]`);if(button){button.disabled=true;button.textContent='Finding location…';}
  const screen=state.screen;
  navigator.geolocation.getCurrentPosition(position=>{const p={id:null,name:'My location',lat:position.coords.latitude,lng:position.coords.longitude};if(!validPoint(p)){if(screen===state.screen)render();toast('Could not read your location.');return;}if(foodMode)state.delivery=p;else state.from=p;if(state.screen===screen)render();toast('Location added. Check the pin before continuing.');},()=>{if(state.screen===screen)render();toast('Location unavailable. Choose an area or place a map pin.');},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
}
function changeQuantity(itemId,rid,delta){
  const r=restaurant(rid);if(!r||!r.items.some(i=>i.id===itemId)||![1,-1].includes(delta))return;
  if(state.cartRestaurant&&state.cartRestaurant!==rid&&totals().count){if(delta<0)return;if(!window.confirm('Start a new basket from '+r.name+'? Your current basket will be cleared.'))return;state.cart={};}
  state.cartRestaurant=rid;const current=state.cart[itemId]||0;const next=Math.max(0,Math.min(20,current+delta));if(next)state.cart[itemId]=next;else delete state.cart[itemId];
  render();const target=document.querySelector(`[data-action="quantity"][data-id="${itemId}"][data-delta="${delta}"]`);target?.focus({preventScroll:true});
}
function createFood(){if(state.screen!=='food-review')return;const t=totals(),r=restaurant(state.cartRestaurant);if(!r||!t.count){go('cart');return;}if(!state.landmark.trim()||!validPoint(state.delivery)){showError('Add a delivery location and landmark.');return;}const job={id:'DEMO-'+String(state.sequence++).padStart(3,'0'),type:'food',step:0,cancelled:false,restaurantName:r.name,from:{...place(r.area)},to:{...state.delivery},lines:t.lines.map(i=>({...i})),deliveryFee:t.delivery,total:t.total,payment:state.payment,landmark:state.landmark,notes:state.notes};state.jobs.unshift(job);state.selectedJob=job.id;state.cart={};state.cartRestaurant=null;go('status');}
function createRide(){if(state.screen!=='ride-review')return;if(!validPoint(state.from)||!validPoint(state.to)||samePoint(state.from,state.to)){showError('Choose different pickup and destination locations.');return;}const job={id:'DEMO-'+String(state.sequence++).padStart(3,'0'),type:'ride',step:0,cancelled:false,from:{...state.from},to:{...state.to},total:rideFare(route(state.from,state.to)),payment:state.payment,pickupNote:state.pickupNote};state.jobs.unshift(job);state.selectedJob=job.id;go('status');}

document.addEventListener('click',event=>{
  const target=event.target.closest?.('[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action;
  if(['home','food','ride','activity','cart','delivery'].includes(action)){go(action);return;}
  if(action==='menu'){state.restaurantId=state.cartRestaurant||state.restaurantId;go('menu');}
  if(action==='restaurant'){if(restaurant(target.dataset.id)){state.restaurantId=target.dataset.id;go('menu');}}
  if(action==='filter'){state.filter=target.dataset.value;render();}
  if(action==='quantity')changeQuantity(target.dataset.id,target.dataset.restaurant,Number(target.dataset.delta));
  if(action==='swap'){[state.from,state.to]=[state.to,state.from];render();}
  if(action==='gps-ride')geolocate(false);
  if(action==='gps-delivery')geolocate(true);
  if(action==='review-food'){if(!state.landmark.trim()){showError('Enter a landmark or delivery instruction to continue.');return;}go('food-review');}
  if(action==='review-ride'){if(samePoint(state.from,state.to)){showError('Choose different pickup and destination locations.');return;}go('ride-review');}
  if(action==='place-food')createFood();
  if(action==='place-ride')createRide();
  if(action==='job'){state.selectedJob=target.dataset.id;go('status');}
  if(action==='advance'){const idx=state.jobs.findIndex(j=>j.id===state.selectedJob);if(idx>=0){state.jobs[idx]=nextStep(state.jobs[idx]);render();}}
  if(action==='cancel'){const job=state.jobs.find(j=>j.id===state.selectedJob);if(job&&job.step<4&&!job.cancelled&&window.confirm('Cancel this demo request? No refund is needed because no payment was made.')){job.cancelled=true;render();}}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='food-search'){state.search=el.value.slice(0,80);document.getElementById('restaurants').innerHTML=restaurantCards();}
  if(el.id==='landmark')state.landmark=el.value.slice(0,160);
  if(el.id==='food-notes')state.notes=el.value.slice(0,200);
  if(el.id==='pickup-note')state.pickupNote=el.value.slice(0,160);
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.name==='payment'&&['Wave','Cash'].includes(el.value))state.payment=el.value;
  if(el.id==='pin-mode'&&['from','to'].includes(el.value))state.pinMode=el.value;
  if(['ride-from','ride-to','delivery-area'].includes(el.id)){const p=place(el.value);if(!p)return;state[el.id==='ride-from'?'from':el.id==='ride-to'?'to':'delivery']={...p};render();}
});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'start_rideapp_demo_flow',title:'Open a RideApp demo screen',description:'Navigate to home, food, ride or activity. No orders or payments are sent.',inputSchema:{type:'object',properties:{screen:{type:'string',enum:['home','food','ride','activity']}},required:['screen'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='screen')||!['home','food','ride','activity'].includes(input.screen))throw new Error('Choose a valid demo screen.');go(input.screen);return {screen:state.screen,demo:true,realRequestSent:false};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
render();

// Load the restaurant menu from Supabase. If that fails, the built-in demo menu stays.
async function loadMenu(){if(!SUPABASE.url||!SUPABASE.publishableKey)return;try{const list=await fetchMenu(SUPABASE);if(!list.length)return;useMenu(list);state.menuSource='database';if(!restaurant(state.restaurantId))state.restaurantId=list[0].id;if(state.cartRestaurant&&!restaurant(state.cartRestaurant)){state.cartRestaurant=null;state.cart={};}const typing=document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);if(!typing)render();}catch(error){console.warn('Using the built-in demo menu:',error.message);}}
loadMenu();
