export const TAU = Math.PI * 2;
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const THEMES = [
 {id:'nexus',name:'Hacker Nexus',tag:'HACKERX / MAINFRAME',desc:'An electric skyline. Sweeping corners. A city that never lifts.',sky:0x080f20,fog:0x122336,ground:0x101b28,accent:0x38ff88,secondary:0x05bba4,type:'city'},
 {id:'storm',name:'Cyberstorm',tag:'RAIN / NIGHT RUN',desc:'Rain-soaked tarmac beneath the violet towers. Reduced grip.',sky:0x080817,fog:0x17182e,ground:0x10101c,accent:0xb29aff,secondary:0xff427d,type:'rain',grip:.82},
 {id:'arctic',name:'Arctic Apex',tag:'SNOW / ALPINE',desc:'Glacial peaks and frozen air. Precision wins on cold asphalt.',sky:0x9abfd0,fog:0xb2cfdb,ground:0xc8dce2,accent:0x69daff,secondary:0x4466ff,type:'snow',grip:.88},
 {id:'solar',name:'Solar Drift',tag:'SUNSET / BADLANDS',desc:'Golden dunes and a sun hanging low over the horizon.',sky:0xbc6c55,fog:0xc28a66,ground:0x9d7450,accent:0xffb55b,secondary:0xff6440,type:'desert'},
 {id:'emerald',name:'Emerald Velocity',tag:'DAYLIGHT / BIOSPHERE',desc:'A flowing circuit through a rewilded world of towering pines.',sky:0x769e9a,fog:0x81a99d,ground:0x264739,accent:0xa9ff8a,secondary:0x32d9b5,type:'forest'},
 {id:'quantum',name:'Quantum Circuit',tag:'AFTER DARK / EXPERIMENTAL',desc:'Luminous architecture. Orbital gates. Racing beyond the ordinary.',sky:0x0c081b,fog:0x231539,ground:0x151027,accent:0xff79db,secondary:0x7a7aff,type:'quantum'}
];
export const ACTIVE_CAR='aventador';
export const CARS = [{id:ACTIVE_CAR,name:'Lamborghini Aventador',class:'V12 / ORIGINAL GLB',price:0,power:23,max:92,grip:1.06,desc:'Your original model. Original textures. One-make racing.'}];
export const LOCKED_CARS=['Spectre GT','Volt R','Ronin S','Apex One'];
export const ITEMS=[];
export const NITRO_SECONDS=10;
export const DEFAULT_KEYS={throttle:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',drift:'ShiftLeft',boost:'Space',camera:'KeyC',pause:'KeyP',reset:'KeyR'};
// Arc-length lookup makes speed independent of the curve's parameterization.
const raw=t=>({x:Math.sin(t)*205+Math.sin(3*t)*26,z:Math.cos(t)*270+Math.sin(2*t)*35});
export const TRACK=[];let distance=0,prev=raw(0);
for(let i=0;i<=1200;i++){const p=raw(i/1200*TAU);if(i)distance+=Math.hypot(p.x-prev.x,p.z-prev.z);TRACK.push({...p,s:distance});prev=p;}
export const LENGTH=distance;
export function track(s,offset=0){s=((s%LENGTH)+LENGTH)%LENGTH;let lo=0,hi=TRACK.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(TRACK[m].s<s)lo=m;else hi=m;}const a=TRACK[lo],b=TRACK[hi],f=(s-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);return{x:a.x+dx*f-dz/l*offset,z:a.z+dz*f+dx/l*offset,heading:Math.atan2(dx,dz)};}
export function curvature(s){const a=track(s).heading,b=track(s+12).heading;return Math.atan2(Math.sin(b-a),Math.cos(b-a))/12;}
export function createRacer(id,name,index,car=ACTIVE_CAR,custom={}){return{id,name,car,custom,s:-index*8,lateral:(index%2?3:-3),v:0,side:0,drift:0,boost:100,nitroActive:false,collisions:0,finished:false,time:0,lap:1,input:{},lastInput:0};}
export function stepCar(c,input,dt,theme='nexus'){
 if(c.finished){c.nitroActive=false;return;}
 const spec=CARS.find(v=>v.id===c.car)||CARS[0],grip=(THEMES.find(t=>t.id===theme)?.grip||1)*spec.grip;
 const throttle=clamp(Number(input.throttle)||0,0,1),brake=clamp(Number(input.brake)||0,0,1),steer=clamp(Number(input.steer)||0,-1,1),drifting=!!input.drift&&Math.abs(c.v)>15;
 const nitro=!!input.boost&&c.boost>1e-7&&throttle>0&&c.v>=0;
 c.nitroActive=nitro;
 c.boost=clamp(c.boost-(nitro?100/NITRO_SECONDS:0)*dt,0,100);
 const acceleration=throttle*(spec.power+(nitro?18:0))-brake*(c.v>1?40:10)-c.v*.13-c.v*Math.abs(c.v)*.0016;
 c.v=clamp(c.v+acceleration*dt,-10,spec.max+(nitro?14:0));
 const curve=curvature(c.s),centrifugal=curve*c.v*c.v*.18;
 const target=steer*(3+Math.abs(c.v)*.13)*clamp(Math.abs(c.v)/5,0,1)*(drifting?1.4:1)+centrifugal*(drifting?.7:.25)/grip;
 c.side+=(target-c.side)*Math.min(1,dt*(drifting?2.4:7)*grip);
 c.lateral+=c.side*dt;c.s+=c.v*dt*Math.max(.6,1-Math.abs(c.side)*.008);
 if(drifting&&Math.abs(steer)>.25)c.drift+=Math.abs(c.side*c.v)*dt*.06;
 if(Math.abs(c.lateral)>9.7){c.lateral=Math.sign(c.lateral)*9.7;c.side*=-.3;c.v*=.83;c.collisions++;}
 c.lap=Math.max(1,Math.floor(c.s/LENGTH)+1);
}
export const DIFFICULTY={low:{pace:.67,reaction:.5,error:2.2,risk:.25},medium:{pace:.79,reaction:.3,error:1.1,risk:.45},default:{pace:.87,reaction:.18,error:.6,risk:.65},max:{pace:.97,reaction:.09,error:.2,risk:.9}};
export function aiInput(c,cars,difficulty,elapsed,skill=0){
 const d=DIFFICULTY[difficulty]||DIFFICULTY.default;
 if(c.nextThink>elapsed)return c.aiInput||{};c.nextThink=elapsed+d.reaction;
 const bend=curvature(c.s+Math.max(15,c.v*.8));let lane=-Math.sign(bend)*1.4;
 const ahead=cars.find(o=>o!==c&&o.s-c.s>0&&o.s-c.s<28&&!o.finished&&Math.abs(o.lateral-c.lateral)<3);
 if(ahead)lane=ahead.lateral>0?-3.8:3.8;
 const behind=cars.find(o=>o!==c&&c.s-o.s>3&&c.s-o.s<18);
 if(!ahead&&behind&&d.risk>.6)lane=clamp(behind.lateral,-4,4)*.5;
 lane+=Math.sin(elapsed*.7+c.seed)*d.error;
 const desired=Math.min(80,Math.sqrt(21/(Math.abs(bend)+.002)))*clamp(d.pace+skill*.025,.6,1);
 c.aiInput={throttle:c.v<desired?1:.15,brake:c.v>desired+4?.5:0,steer:clamp((lane-c.lateral)*.14-bend*c.v*.33,-1,1),boost:!ahead&&Math.abs(bend)<.003&&d.risk>.6};return c.aiInput;
}
export function collide(cars){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j];if(a.finished||b.finished)continue;if(Math.abs(a.s-b.s)<4.5&&Math.abs(a.lateral-b.lateral)<1.9){const sign=a.lateral>b.lateral?1:-1;a.lateral=clamp(a.lateral+sign*.16,-9.7,9.7);b.lateral=clamp(b.lateral-sign*.16,-9.7,9.7);const v=(a.v+b.v)*.49;a.v=v;b.v=v;a.collisions++;b.collisions++;}}}
export const ECONOMY={startingCoins:100,completion:20,positionBonus:6,driftCap:15,maxReward:90};
export function reward(position,total,drift){return Math.min(ECONOMY.maxReward,ECONOMY.completion+Math.max(0,total-position)*ECONOMY.positionBonus+Math.min(ECONOMY.driftCap,Math.floor(drift/100)));}

