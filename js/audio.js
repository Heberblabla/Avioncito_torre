(() => {
  'use strict';
  class Sound {
    constructor() { this.enabled=true;this.ctx=null;this.lastBoost=0; }
    unlock() {
      if(!this.enabled)return;
      try {
        if(!this.ctx) {
          const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
          this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=0.22;this.master.connect(this.ctx.destination);
          const b=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate), a=b.getChannelData(0);
          let last=0;for(let i=0;i<a.length;i++){last=(last+Math.random()*0.035-0.0175)*0.985;a[i]=last;}
          const src=this.ctx.createBufferSource();src.buffer=b;src.loop=true;
          const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;
          this.windGain=this.ctx.createGain();this.windGain.gain.value=0;
          src.connect(filter);filter.connect(this.windGain);this.windGain.connect(this.master);src.start();
        }
        if(this.ctx.state==='suspended') this.ctx.resume().catch(()=>{});
      } catch { this.ctx=null; }
    }
    setEnabled(value) { this.enabled=value;if(this.master){this.master.gain.value=value?0.22:0;if(value)this.unlock();} }
    wind(active) { if(this.ctx&&this.windGain)this.windGain.gain.setTargetAtTime(active&&this.enabled?0.35:0,this.ctx.currentTime,0.2); }
    tone(freq,duration,volume=0.15,end=freq,type='sine',delay=0) {
      if(!this.enabled||!this.ctx)return;
      const t=this.ctx.currentTime+delay, o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+0.012);g.gain.exponentialRampToValueAtTime(0.001,t+duration);
      o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+0.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    boost() { const now=this.ctx?.currentTime||0;if(now-this.lastBoost<0.08)return;this.lastBoost=now;this.tone(145,0.12,0.09,210,'triangle'); }
    pass(giant) { this.tone(giant?660:510,0.09,0.1,giant?880:690,'triangle'); }
    stage() { [440,554,660].forEach((f,i)=>this.tone(f,0.2,0.15,f,'triangle',i*0.1)); }
    record() { [523,659,784,1046].forEach((f,i)=>this.tone(f,0.18,0.13,f,'triangle',i*0.09)); }
    crash() { this.tone(105,0.3,0.65,25,'sawtooth');this.tone(650,0.075,0.28,60,'square'); }
  }
  AV.Sound=Sound;
})();
