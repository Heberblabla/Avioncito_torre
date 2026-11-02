(() => {
const selected={ceiling:false,speed:false,fuel:false,precision:false,extras:false,towerExtras:false};
const panel=document.createElement('div');panel.className='dialog-layer';panel.hidden=true;
panel.innerHTML=`<section class="dialog options-dialog" role="dialog" aria-modal="true" aria-labelledby="modsTitle"><span class="eyebrow">PREPARA TU VUELO</span><h2 id="modsTitle">MODIFICADORES</h2>${[['ceiling','Edificios arriba y abajo','Vuela por el pasillo entre edificios.'],['speed','Velocidad progresiva','Cada edificio aumenta la velocidad sin límite.'],['fuel','Combustible limitado','Los impulsos gastan combustible. Recoge depósitos.'],['precision','Precisión','Cruza el centro de las puertas marcadas.'],['extras','Más tipos de obstáculos','Globos, drones y barreras suspendidas.']].map(([id,title,desc])=>`<label class="setting-row"><div><strong>${title}</strong><small>${desc}</small></div><input type="checkbox" data-mod="${id}"></label>`).join('')}<label class="setting-row" id="towerExtraRow" hidden><div><strong>También al subir y bajar rascacielos</strong><small>Incluye obstáculos en ambas transiciones.</small></div><input type="checkbox" data-mod="towerExtras"></label><button class="button primary full" id="modsStart" style="margin-top:16px">Despegar ↗</button><button class="text-button full" id="modsBack">Volver</button></section>`;
document.getElementById('game').append(panel);
panel.querySelector('.dialog').style.cssText='max-height:90%;overflow-y:auto;touch-action:pan-y';
panel.querySelector('[data-mod=extras]').onchange=e=>{panel.querySelector('#towerExtraRow').hidden=!e.target.checked;if(!e.target.checked)panel.querySelector('[data-mod=towerExtras]').checked=false;};
let bypass=false;
document.addEventListener('click',e=>{if(e.target.closest('#play')&&!bypass){e.stopImmediatePropagation();e.preventDefault();panel.hidden=false;panel.querySelector('input').focus();}},true);
document.addEventListener('keydown',e=>{if(!panel.hidden&&e.code==='Escape'){e.stopImmediatePropagation();panel.hidden=true;}else if(panel.hidden&&e.code==='Space'&&document.getElementById('game').dataset.state==='menu'&&!bypass){e.preventDefault();e.stopImmediatePropagation();panel.hidden=false;}},true);
panel.querySelector('#modsBack').onclick=()=>panel.hidden=true;
panel.querySelector('#modsStart').onclick=()=>{panel.querySelectorAll('input').forEach(x=>selected[x.dataset.mod]=x.checked);panel.hidden=true;bypass=true;document.getElementById('play').click();bypass=false;};
const Original=AV.Flight;
AV.Flight=class extends Original{
 constructor(...args){super(...args);this.mods={...selected};this.fuel=100;this.gates=new Set();this.pickups=new Set();this.extraHazards=[];this.extraIds=new Set();}
 step(dt,held=false,taps=0){
  if(this.state!=='running')return;
  const before=this.passed;
  if(this.mods.fuel){if(this.fuel<=0){held=false;taps=0;}this.fuel=Math.max(0,this.fuel-(held?5*dt:0)-taps*1.2);}
  if(this.mods.speed){const target=AV.CONFIG.difficulty.initialSpeed+this.passed*2;const normal=AV.difficulty(this.stage).speed;this.speed=normal+(target-normal)*Math.exp(1.5*dt);}
  super.step(dt,held,taps);
  if(this.mods.speed)this.speed=AV.CONFIG.difficulty.initialSpeed+this.passed*2;
  if(this.state!=='running')return;
  const p=this.plane;
  if(this.mods.extras){
   const add=(key,x,y,type)=>{if(this.extraIds.has(key))return;this.extraIds.add(key);this.extraHazards.push({key,x,y,type,w:type===2?62:32,h:type===2?12:28});};
   for(const b of this.city.obstacles){
    if(!b.giant&&b.id%2===0){const x=b.x+b.w+150;const near=this.city.specials.some(g=>x>g.start-g.lead&&x<g.end+900);if(!near)add('b'+b.id,x,AV.CONFIG.view.ground-b.h-80,b.id%3);}
   }
   if(this.mods.towerExtras)for(const g of this.city.specials){
    const roof=AV.CONFIG.view.ground-g.height;
    add('up'+g.id,g.start-g.lead*.45,(190+roof-80)/2,0);
    add('down'+g.id,g.end+520,(190+roof-80)/2,1);
   }
   this.extraHazards=this.extraHazards.filter(o=>o.x>p.x-450);if(this.extraIds.size>180)this.extraIds=new Set(this.extraHazards.map(o=>o.key));
   for(const o of this.extraHazards){if(Math.abs(o.x-p.x)>o.w+45)continue;const rect={x:o.x-o.w/2,y:o.y-o.h/2,w:o.w,h:o.h};if(AV.planePolygons(p,.94).some(poly=>AV.polygonRect(poly,rect))){this.state='crashed';this.hit={kind:'obstacle',x:o.x,y:o.y};this.events.push({type:'crash',hit:this.hit});break;}}
   if(this.state!=='running')return;
  }
  for(const b of this.city.obstacles){
   if(b.giant)continue;
   const top=AV.CONFIG.view.ground-b.h;
   const roof=Math.max(36,top-190);
   if(this.mods.ceiling&&p.x+36>b.x&&p.x-36<b.x+b.w){
    if(AV.planePolygons(p,.94).some(poly=>AV.polygonRect(poly,{x:b.x,y:-2000,w:b.w,h:2000+roof})))this.fail(b,p.y);
   }
   const gateX=b.x+b.w/2,gateY=top-95;
   if(this.mods.precision&&!this.gates.has(b.id)&&p.x>=gateX){this.gates.add(b.id);if(Math.abs(p.y-gateY)>43)this.fail(b,p.y);}
   const fuelX=b.x+b.w+115,fuelY=top-80;
   if(this.mods.fuel&&!this.pickups.has(b.id)&&Math.abs(p.x-fuelX)<32&&Math.abs(p.y-fuelY)<38){this.pickups.add(b.id);this.fuel=Math.min(100,this.fuel+22);}
  }
 }
 fail(b,y){if(this.state!=='running')return;this.state='crashed';this.hit={kind:'building',building:{...b,giant:false},x:this.plane.x,y};this.events.push({type:'crash',hit:this.hit});}
};
const draw=AV.Renderer.prototype.draw;
AV.Renderer.prototype.draw=function(args){draw.call(this,args);const f=args.flight;if(args.menu||!f?.mods)return;const ctx=this.ctx,offset=f.plane.x-this.anchor,cam=f.camera.y;ctx.save();ctx.setTransform(this.scale,0,0,this.scale,0,0);
for(const b of f.city.obstacles){if(b.giant)continue;const x=b.x-offset,top=AV.CONFIG.view.ground-b.h;if(x>this.width+80||x+b.w<-150)continue;
 if(f.mods.ceiling){const roof=Math.max(36,top-190)-cam;ctx.fillStyle='#242624';ctx.fillRect(x,0,b.w,Math.max(0,roof));ctx.fillStyle='#f7f7f2';for(let y=roof-12;y>0;y-=12)for(let col=8;col<b.w-5;col+=12)ctx.fillRect(x+col,y,4,4);}
 if(f.mods.precision){const y=top-95-cam,gx=x+b.w/2;ctx.strokeStyle='#242624';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(gx-7,y-43,14,86);ctx.setLineDash([]);}
 if(f.mods.fuel&&!f.pickups.has(b.id)){const fx=x+b.w+115,fy=top-80-cam;ctx.fillStyle='#f7f7f2';ctx.fillRect(fx-10,fy-12,20,24);ctx.strokeStyle='#242624';ctx.strokeRect(fx-10,fy-12,20,24);ctx.fillStyle='#242624';ctx.font='12px monospace';ctx.fillText('F',fx-4,fy+4);}
}
if(f.mods.extras)for(const o of f.extraHazards){const x=o.x-offset,y=o.y-cam;if(x<-80||x>this.width+80)continue;ctx.fillStyle='#242624';ctx.strokeStyle='#242624';ctx.lineWidth=2;
 if(o.type===0){ctx.beginPath();ctx.ellipse(x,y,16,14,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x,y+14);ctx.lineTo(x,y+26);ctx.stroke();}
 else if(o.type===1){ctx.fillRect(x-16,y-6,32,12);ctx.fillRect(x-10,y-14,20,28);ctx.beginPath();ctx.moveTo(x-23,y-13);ctx.lineTo(x-7,y-13);ctx.moveTo(x+7,y-13);ctx.lineTo(x+23,y-13);ctx.stroke();}
 else{ctx.fillRect(x-31,y-6,62,12);ctx.fillStyle='#f7f7f2';for(let a=-26;a<28;a+=12)ctx.fillRect(x+a,y-3,5,6);}
}
if(f.mods.fuel){ctx.fillStyle='#f7f7f2';ctx.fillRect(20,100,160,34);ctx.fillStyle='#242624';ctx.font='11px monospace';ctx.fillText('COMBUSTIBLE '+Math.ceil(f.fuel)+'%',28,113);ctx.strokeRect(28,120,135,5);ctx.fillRect(28,120,135*f.fuel/100,5);}
ctx.restore();};
})();
