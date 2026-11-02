(() => {
  'use strict';
  const C=AV.CONFIG, INK='#242624', PAPER='#f7f7f2';
  const hash=n=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  class Particles {
    constructor(){this.items=[];}
    clear(){this.items.length=0;}
    add(p){if(this.items.length>=C.effects.maxParticles)this.items.shift();this.items.push(p);}
    smoke(p,strong=false){
      const c=Math.cos(p.angle),s=Math.sin(p.angle);
      for(let i=0;i<(strong?4:1);i++)this.add({x:p.x-34*c,y:p.y-34*s+2,vx:-30-Math.random()*25,vy:Math.random()*18-9,size:2+Math.random()*3,life:0.5+Math.random()*0.25,age:0,kind:'smoke'});
    }
    impact(x,y,reduced=false){
      for(let i=0;i<(reduced?12:C.effects.impactCount);i++){
        const a=Math.random()*Math.PI*2,v=35+Math.random()*180;
        this.add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-50,size:2+Math.random()*4,age:0,life:0.6+Math.random()*0.65,kind:i%4===0?'spark':'debris'});
      }
    }
    step(dt){
      for(const p of this.items){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind!=='smoke')p.vy+=260*dt;}
      this.items=this.items.filter(p=>p.age<p.life);
    }
    draw(ctx,offset,camera){
      for(const p of this.items){
        const fade=1-p.age/p.life;ctx.globalAlpha=fade*(p.kind==='smoke'?0.33:1);
        const x=Math.round(p.x-offset),y=Math.round(p.y-camera),z=p.size*(p.kind==='smoke'?1+p.age:1);
        ctx.fillStyle=INK;
        if(p.kind==='spark'){ctx.fillRect(x-z*1.7,y-1,z*3.4,2);ctx.fillRect(x-1,y-z*1.7,2,z*3.4);}else ctx.fillRect(x,y,z,z);
      }
      ctx.globalAlpha=1;
    }
  }
  function drawPlane(ctx,x,y,angle=0,scale=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle=INK;
    ctx.beginPath();for(const poly of AV.PLANE){poly.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();}ctx.fill();
    ctx.fillStyle=PAPER;for(let i=0;i<6;i++)ctx.fillRect(-18+i*5,-4,2.6,2.6);
    ctx.fillRect(17,-2,6,2);ctx.restore();
  }
  function cloud(ctx,x,y,size){
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);
    ctx.strokeStyle='#b8bbb5';ctx.lineWidth=1.35/size;ctx.lineJoin='miter';
    const points=[[0,16],[7,16],[7,12],[15,12],[15,8],[26,8],[26,4],[33,4],[33,0],[46,0],[46,3],[52,3],[52,7],[62,7],[62,10],[70,10],[70,14],[77,14],[77,18],[0,18]];
    ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.stroke();ctx.restore();
  }
  class Renderer {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=1067;this.height=C.view.height;this.scale=1;this.particles=new Particles();}
    resize(){
      const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,C.view.maxDpr);
      this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
      this.scale=this.canvas.height/C.view.height;this.width=this.canvas.width/this.scale;
      this.ctx.imageSmoothingEnabled=false;
    }
    get anchor(){return Math.max(155,this.width*C.view.playerX);}
    background(offset,cam,time,menu=false){
      const ctx=this.ctx,w=this.width;
      // Nubes calculadas por celdas: no se acumulan objetos durante partidas largas.
      for(let row=-4;row<3;row++) {
        const cy=85+row*170-cam*0.72;
        if(cy<-60||cy>560)continue;
        const off=offset*0.12+time*3+row*113;
        const start=Math.floor(off/310)-1;
        for(let i=start;i<start+Math.ceil(w/310)+3;i++)cloud(ctx,i*310-off+hash(i+row*23)*70,cy+hash(i*3+row*41)*45,0.8+hash(i*7+row*31)*0.65);
      }
      for(let layer=0;layer<2;layer++) {
        const factor=layer?0.32:0.17, off=offset*factor,cell=layer?76:100;
        const base=488-cam*(layer?0.42:0.25),start=Math.floor(off/cell)-1;
        ctx.fillStyle=layer?'#dedfd9':'#e9eae4';
        for(let i=start;i<start+Math.ceil(w/cell)+3;i++) {
          const rnd=hash(i*7+layer*201),height=40+rnd*(layer?178:190),bw=cell*(0.6+hash(i+89)*0.36);
          const x=Math.round(i*cell-off),y=Math.round(base-height);
          ctx.fillRect(x,y,Math.ceil(bw),Math.round(height));
          if(rnd>0.71)ctx.fillRect(x+bw*0.4,y-22,3,24);
        }
      }
      ctx.strokeStyle='#c5c7c0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,488-cam*0.42);ctx.lineTo(w,488-cam*0.42);ctx.stroke();
      const ground=C.view.ground-cam;
      if(ground<600){
        ctx.fillStyle=PAPER;ctx.fillRect(0,ground,w,600-ground);
        ctx.strokeStyle='#82877e';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,ground);ctx.lineTo(w,ground);ctx.stroke();
        ctx.strokeStyle='#d5d7ce';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,ground+5);ctx.lineTo(w,ground+5);ctx.stroke();
        const start=Math.floor(offset/37)-1;ctx.fillStyle='#b3b7ac';
        for(let i=start;i<start+Math.ceil(w/37)+3;i++){
          const x=i*37-offset;ctx.fillRect(Math.round(x),ground+13+hash(i*13)*30,2+hash(i)*6,1.8);
        }
      }
    }
    building(b,offset,cam){
      const ctx=this.ctx,x=Math.round(b.x-offset),top=Math.round(C.view.ground-b.h-cam);
      if(x>this.width+5||x+b.w<0||top>600)return;
      const bottom=C.view.ground-cam;
      ctx.fillStyle=INK;ctx.fillRect(x,top,b.w,Math.min(b.h,600-top));
      ctx.fillStyle='#444841';ctx.fillRect(x+2,top+2,2,Math.min(b.h-2,600-top));
      const cols=Math.max(3,Math.floor((b.w-10)/10)),space=(b.w-12)/cols;
      const rowStart=Math.max(0,Math.ceil((-top-9)/12)),rowEnd=Math.min(Math.floor((b.h-11)/12),Math.ceil((600-top)/12));
      ctx.fillStyle='#f2f3eb';
      for(let r=rowStart;r<=rowEnd;r++)for(let c=0;c<cols;c++){
        if((r*7+c*3+b.variant)%19===0)continue;
        ctx.fillRect(Math.round(x+7+c*space),top+8+r*12,Math.max(3,Math.floor(space-4)),4);
      }
      if(!b.giant&&b.variant===2){ctx.fillStyle='#3f443c';ctx.fillRect(x+9,bottom-18,8,18);}
    }
    draw({flight,accident,time=0,menu=false,reduced=false,shake=0}){
      const ctx=this.ctx;ctx.setTransform(this.scale,0,0,this.scale,0,0);
      ctx.fillStyle=PAPER;ctx.fillRect(0,0,this.width,600);
      ctx.save();
      if(shake&&!reduced)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
      let offset=menu?time*25:flight.plane.x-this.anchor,cam=menu?0:flight.camera.y;
      this.background(offset,cam,time,menu);
      if(menu){
        const planeX=this.width*0.72,planeY=247+Math.sin(time*1.5)*9;
        const start=planeX-220;
        ctx.fillStyle='#a0a59a';
        for(let i=0;i<12;i++){const x=start+i*12-(time*24%12);ctx.globalAlpha=(i/12)*0.6;ctx.fillRect(x,planeY+4+Math.sin(i*.9+time)*2,4,2);}
        ctx.globalAlpha=1;drawPlane(ctx,planeX,planeY,-.035+Math.sin(time)*.025,1.8);
        for(let i=0;i<4;i++)this.building({x:(i*347+80)-((time*25)%347)+offset,w:46+i%2*15,h:58+i%3*23,variant:i,giant:false},offset,0);
        // Pequeños instrumentos de navegación alrededor del avión del menú.
        ctx.strokeStyle='#c5c8bd';ctx.lineWidth=1;ctx.setLineDash([2,5]);ctx.beginPath();ctx.moveTo(planeX,planeY+58);ctx.lineTo(planeX,445);ctx.stroke();ctx.setLineDash([]);
        ctx.font='9px monospace';ctx.fillStyle='#818879';ctx.fillText('ALT. 284',planeX+9,412);
      } else {
        // Durante la llegada pasa por detrás de la primera torre.
        if(accident?.buddy&&!accident.buddyHit){const p=accident.buddy;drawPlane(ctx,p.x-offset,p.y-cam,p.angle,p.scale);}
        for(const b of flight.city.obstacles)this.building(b,offset,cam);
        this.particles.draw(ctx,offset,cam);
        const p=accident?accident.plane:flight.plane;
        drawPlane(ctx,p.x-offset,p.y-cam,p.angle);
        if(accident?.buddy&&accident.buddyHit){const p=accident.buddy;drawPlane(ctx,p.x-offset,p.y-cam,p.angle,p.scale);}
      }
      ctx.restore();
    }
  }
  Object.assign(AV,{Renderer,Particles,drawPlane});
})();
