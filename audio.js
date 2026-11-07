export class AudioEngine {
 constructor(){this.settings={volume:.5,engineVolume:.6,musicVolume:.08,fxVolume:.6};this.lastHit=0;this.loaded=null;this.paused=false;}
 async init(){
  if(!this.ctx){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   this.ctx=new Context();this.master=this.ctx.createGain();const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.ratio.value=6;this.master.connect(limiter);limiter.connect(this.ctx.destination);
   this.engineLayers=[];
   this.loaded=Promise.all(['aventador-engine','aventador-high','aventador-start'].map(async name=>{const response=await fetch(`./assets/audio/${name}.wav`);if(!response.ok)throw new Error('Engine recording unavailable');return this.ctx.decodeAudioData(await response.arrayBuffer());})).then(buffers=>{
    this.startBuffer=buffers[2];for(let i=0;i<2;i++){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffers[i];source.loop=true;source.loopStart=.08;source.loopEnd=buffers[i].duration-.08;gain.gain.value=0;source.connect(gain);gain.connect(this.master);source.start();this.engineLayers.push({source,gain});}
   }).catch(error=>{console.warn(error.message);this.loadError=true;});
   const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.noiseBuffer=buffer;
   const noise=this.ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1800;
   this.skid=this.ctx.createGain();this.skid.gain.value=0;noise.connect(filter);filter.connect(this.skid);this.skid.connect(this.master);
   const nitroFilter=this.ctx.createBiquadFilter();nitroFilter.type='highpass';nitroFilter.frequency.value=650;this.nitro=this.ctx.createGain();this.nitro.gain.value=0;noise.connect(nitroFilter);nitroFilter.connect(this.nitro);this.nitro.connect(this.master);noise.start();
   this.note=0;this.musicTimer=setInterval(()=>this.music(),330);
  }
  if(this.ctx.state==='suspended')await this.ctx.resume();await this.loaded;
 }
 startEngine(){if(!this.ctx||!this.startBuffer)return;const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=this.startBuffer;g.gain.value=this.settings.engineVolume*.4;s.connect(g);g.connect(this.master);s.start();}
 tone(freq,duration=.13,volume=.12,type='sine'){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),now=this.ctx.currentTime;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(this.master);o.start();o.stop(now+duration);}
 music(){if(!this.ctx||document.hidden||this.paused)return;const notes=[55,82.4,110,82.4,65.4,98,130.8,98];this.tone(notes[this.note++%notes.length],.3,this.settings.musicVolume*.025,'triangle');}
 update(car,racing,paused){
  if(!this.ctx)return;this.paused=paused;const now=this.ctx.currentTime,active=racing&&!paused&&!car?.finished,speed=Math.abs(car?.v||0),gear=Math.max(1,Math.floor(speed/20)+1),rpm=.68+(speed%20)/20*.65;
  this.master.gain.setTargetAtTime(this.settings.volume,now,.04);
  for(let i=0;i<this.engineLayers.length;i++){const {source,gain}=this.engineLayers[i];source.playbackRate.setTargetAtTime(rpm+(car?.nitroActive?.15:0),now,.12);const mix=i===0?1-Math.min(.75,speed/100):Math.min(.85,speed/75);gain.gain.setTargetAtTime(active?this.settings.engineVolume*mix*(.32+Math.min(1,speed/40)*.3):0,now,.09);}
  this.skid.gain.setTargetAtTime(active&&Math.abs(car?.side||0)>5?this.settings.fxVolume*.04:0,now,.08);
  this.nitro.gain.setTargetAtTime(active&&car?.nitroActive?this.settings.fxVolume*.055:0,now,.07);
  if(active&&car?.collisions>this.lastHit){this.impact();this.lastHit=car.collisions;}
  if(active&&gear!==this.lastGear&&this.lastGear)this.tone(75,.06,this.settings.fxVolume*.035,'triangle');this.lastGear=gear;
 }
 impact(){this.tone(65,.13,this.settings.fxVolume*.16,'triangle');}
 cheer(){if(!this.ctx)return;const now=this.ctx.currentTime,n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noiseBuffer;n.loop=true;f.type='bandpass';f.frequency.value=900;f.Q.value=.5;g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(this.settings.fxVolume*.12,now+.4);g.gain.exponentialRampToValueAtTime(.001,now+3.5);n.connect(f);f.connect(g);g.connect(this.master);n.start();n.stop(now+4);}
}
