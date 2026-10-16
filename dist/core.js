export const PLACES = [
  {id:'brusubi',name:'Brusubi',lat:13.4074354,lng:-16.7306748},
  {id:'senegambia',name:'Senegambia area',lat:13.4431377,lng:-16.719757},
  {id:'bakau',name:'Bakau',lat:13.477453,lng:-16.6779085},
  {id:'banjul',name:'Banjul',lat:13.4410165,lng:-16.5627509}
];
export const RESTAURANTS = [
  {id:'kitchen',name:'Sample kitchen',tag:'Local favourites',area:'brusubi',emoji:'🍲',category:'Local',items:[
    {id:'benachin',name:'Benachin',description:'Rice, vegetables & chicken',price:250},
    {id:'domoda',name:'Domoda',description:'Peanut stew served with rice',price:225},
    {id:'fish',name:'Grilled fish',description:'Fish, rice & fresh salad',price:300},
    {id:'juice',name:'Fresh juice',description:'A refreshing drink with your meal',price:75}]},
  {id:'grill',name:'Coastal grill',tag:'Grilled meals & sides',area:'senegambia',emoji:'🐟',category:'Grill',items:[
    {id:'grill-fish',name:'Fish plate',description:'Grilled fish with rice and vegetables',price:325},
    {id:'chicken',name:'Chicken plate',description:'Grilled chicken, rice & salad',price:275},
    {id:'plantain',name:'Plantain side',description:'A small plate of fried plantain',price:100}]},
  {id:'bowl',name:'Blue bowl',tag:'Vegetable bowls & drinks',area:'bakau',emoji:'🥗',category:'Vegetarian',items:[
    {id:'vegbowl',name:'Vegetable rice bowl',description:'Rice with seasonal vegetables',price:200},
    {id:'beans',name:'Beans & rice',description:'A hearty bowl with a vegetable side',price:175},
    {id:'bowl-juice',name:'Fresh juice',description:'A refreshing drink with your meal',price:75}]}
];
export const FOOD_STEPS = ['Order confirmed','Preparing your food','Courier collecting','On the way','Delivered'];
export const RIDE_STEPS = ['Request confirmed','Demo driver assigned','Driver at pickup','Trip in progress','Trip complete'];
export const money = amount => 'D '+Math.round(amount).toLocaleString('en-GB');
export const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const place = id => PLACES.find(p=>p.id===id);
export const restaurant = id => RESTAURANTS.find(r=>r.id===id);
export function validPoint(p){return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
export function samePoint(a,b){return validPoint(a)&&validPoint(b)&&Math.abs(a.lat-b.lat)<0.00005&&Math.abs(a.lng-b.lng)<0.00005;}
export function mapsURL(a,b){if(!validPoint(a)||!validPoint(b))throw new Error('Choose both locations.');const params=new URLSearchParams({api:'1',origin:`${a.lat},${a.lng}`,destination:`${b.lat},${b.lng}`,travelmode:'driving'});return 'https://www.google.com/maps/dir/?'+params.toString();}
export function foodTotals(restaurantId,cart){const r=restaurant(restaurantId);let subtotal=0,count=0;const lines=[];if(r)for(const item of r.items){const quantity=cart[item.id]||0;if(!Number.isInteger(quantity)||quantity<0||quantity>20)throw new Error('Choose a quantity from 0 to 20.');if(quantity){lines.push({...item,quantity,total:item.price*quantity});subtotal+=item.price*quantity;count+=quantity;}}const delivery=count?50:0;return {lines,count,subtotal,delivery,total:subtotal+delivery};}
export function rideFare(route){return route?Math.max(150,Math.ceil((75+20*route.distance/1000)/5)*5):200;}
export function findRoute(routes,a,b){return a&&b&&a.id&&b.id?routes[`${a.id}-${b.id}`]||null:null;}
export function nextStep(job){const steps=job.type==='food'?FOOD_STEPS:RIDE_STEPS;if(job.cancelled||job.step>=steps.length-1)return job;return {...job,step:job.step+1};}
