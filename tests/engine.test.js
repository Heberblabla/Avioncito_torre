import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/config.js';
import '../js/engine.js';
import '../js/renderer.js';
const {Flight,CONFIG:C,collision,City,Accident,Camera,Particles}=globalThis.AV;
const dt=C.physics.fixedStep;
function fly(f,seconds,control=()=>({})){
  for(let i=0;i<Math.round(seconds/dt)&&f.state==='running';i++){
    const c=control(i*dt,f);f.step(dt,!!c.held,c.tap?1:0);
  }
}
function pilot(f,untilStage=11){
  let lastTap=-1,minCam=0,maxObjects=0,returned=false,wasHigh=false;
  const limit=220000;
  for(let n=0;n<limit && f.state==='running'&& f.stage<untilStage;n++){
    const g=f.city.specialAt(f.plane.x);
    let target=186;
    if(g&&f.plane.x<g.end+80)target=C.view.ground-g.height-75;
    const need=f.plane.y+f.plane.vy*0.30>target;
    const tap=need&&f.elapsed-lastTap>=0.215;
    if(tap)lastTap=f.elapsed;
    f.step(dt,need && f.elapsed-lastTap<0.085,tap?1:0);f.drainEvents();
    minCam=Math.min(minCam,f.camera.y);maxObjects=Math.max(maxObjects,f.city.obstacles.length);
    if(f.camera.y<-150)wasHigh=true;if(wasHigh&&f.camera.y===0)returned=true;
  }
  return {minCam,maxObjects,returned};
}
test('Sin entrada cae de forma progresiva y colisiona con el suelo',()=>{
  const f=new Flight(1);fly(f,0.4);assert.ok(f.plane.y>274);assert.equal(f.state,'running');
  fly(f,3);assert.equal(f.hit.kind,'ground');assert.ok(f.plane.vy<=C.physics.maxFall);
});
test('El impulso se reparte en el tiempo sin saltar de posición',()=>{
  const f=new Flight(1),y=f.plane.y;f.step(dt,false,1);
  assert.ok(Math.abs(f.plane.y-y)<1);assert.ok(f.plane.lift>90);
  fly(f,0.1);assert.ok(f.plane.vy<-40);assert.ok(f.plane.lift<35);
});
test('Toques rápidos ganan más altura que mantener pulsado',()=>{
  const hold=new Flight(2),tap=new Flight(2);
  hold.plane.y=tap.plane.y=380;
  fly(hold,1.5,t=>({held:true,tap:t===0}));
  fly(tap,1.5,(t)=>({held:true,tap:Math.round(t/dt)%26===0}));
  assert.ok(tap.plane.y<hold.plane.y-100);
  assert.ok(tap.plane.vy>=-C.physics.maxRise);
});
test('Toques extremos respetan velocidades y continuidad',()=>{
  const f=new Flight(3);for(let i=0;i<500;i++){
    const y=f.plane.y;f.step(dt,true,1);
    assert.ok(Math.abs(f.plane.y-y)<=C.physics.maxRise*dt+0.001);
    assert.ok(f.plane.vy>=-C.physics.maxRise&&f.plane.vy<=C.physics.maxFall);
    assert.ok(f.plane.y>30,'El techo aerodinámico mantiene el avión visible');
  }
});
test('La geometría detecta ala, nariz y suelo sin llenar esquinas vacías',()=>{
  const p={x:100,y:200,angle:0};
  assert.ok(collision(p,[{x:94,w:4,h:320}])); // ala inferior, techo y=208
  assert.ok(collision(p,[{x:129,w:8,h:330}])); // nariz
  assert.equal(collision(p,[{x:127,w:5,h:321}]),null); // fuera del ala, bajo nariz
  assert.equal(collision(p,[{x:140,w:40,h:440}]),null);
  assert.ok(collision({...p,y:517},[]));
});
test('Cuenta solo tras despejar la cola, una sola vez',()=>{
  const f=new Flight(4),b=f.city.obstacles[0];f.plane.y=160;f.plane.vy=0;
  f.plane.x=b.x+b.w+32;f.step(dt,true);assert.equal(f.passed,0);
  f.plane.x=b.x+b.w+38;f.step(dt,true);assert.equal(f.passed,1);assert.equal(f.score,10);
  fly(f,.2,()=>({held:true}));assert.equal(f.passed,1);
});
test('Un choque no concede un edificio ni permite nuevos puntos',()=>{
  const f=new Flight(5),b=f.city.obstacles[0];f.plane.x=b.x-25;f.plane.y=500;
  f.step(dt);assert.equal(f.state,'crashed');assert.equal(f.score,0);fly(f,3);assert.equal(f.passed,0);
});
test('Generador reproducible, alturas acotadas y exactamente 15 normales entre desafíos',()=>{
  const a=new City(100),b=new City(100);assert.deepEqual(a.obstacles,b.obstacles);
  let lastGroup=null,normals=0;
  for(let s=0;s<20;s++)a.generateStage();
  for(const o of a.obstacles){
    if(!o.giant){normals++;assert.ok(o.h<=C.obstacles.absoluteMaxHeight);}
    else if(o.group!==lastGroup){assert.equal(normals,15);normals=0;lastGroup=o.group;assert.ok(o.h<=810);}
  }
  for(const g of a.specials)assert.ok(g.lead>=AV.runupFor(g.height));
  assert.notDeepEqual(new City(101).obstacles,b.obstacles);
});
test('Piloto con entradas legales supera 10 etapas en 24 ciudades, cámara regresa y memoria queda acotada',()=>{
  for(let seed=1;seed<=24;seed++){
    const f=new Flight(seed),metrics=pilot(f);
    assert.equal(f.state,'running',JSON.stringify({seed,stage:f.stage,hit:f.hit,plane:f.plane}));
    assert.equal(f.stage,11,`seed ${seed}`);assert.ok(f.score>1000);
    assert.ok(metrics.minCam<-200);assert.ok(metrics.returned,`cámara seed ${seed}`);
    assert.ok(metrics.maxObjects<65);assert.ok(f.city.stages.size<=4);
  }
});
test('Un ascenso tardío es evitable: hay margen desde una altura baja con reacción humana',()=>{
  for(let seed=1;seed<=12;seed++){
    const f=new Flight(seed),g=f.city.specials[0];
    f.plane.x=g.start-g.lead+70;f.plane.y=380;f.plane.vy=80;
    // 0.35 s de reacción antes de empezar a pulsar; bajo pero todavía recuperable.
    fly(f,.35);let last=-1;
    while(f.plane.x<g.end+70&&f.state==='running'){
      const need=f.plane.y+f.plane.vy*.3>C.view.ground-g.height-75;
      const tap=need&&f.elapsed-last>.215;if(tap)last=f.elapsed;f.step(dt,need&&f.elapsed-last<.085,tap?1:0);
    }
    assert.equal(f.state,'running',`margen insuficiente seed ${seed}`);
  }
});
test('La cámara nunca mueve el avión y vuelve al suelo tras descender',()=>{
  const cam=new Camera(),p={x:1000,y:-150};
  const g={start:1300,end:1450,height:700,lead:1200};
  for(let i=0;i<600;i++)cam.update(p,g,dt);
  assert.equal(p.y,-150);assert.ok(cam.y<-200);
  p.y=310;for(let i=0;i<600;i++)cam.update(p,null,dt);
  assert.equal(cam.y,0);
});
test('Doble accidente: pausa, llegada, segundo impacto una sola vez y restos visibles',()=>{
  const f=new Flight(6),b=f.city.obstacles.find(b=>b.giant);
  f.plane.x=b.x-26;f.plane.y=200;f.plane.angle=0;f.hit={kind:'building',building:b,x:b.x,y:200};
  const a=new Accident(f);a.step(.6);assert.equal(a.buddy,null);assert.ok(a.plane.angle>0.4);
  a.step(.6);assert.ok(a.buddy);assert.equal(a.buddyHit,false);
  let impacts=0;for(let i=0;i<420;i++){if(a.step(dt).impact)impacts++;}
  assert.equal(impacts,1);assert.ok(a.buddyHit);assert.ok(a.plane&&a.buddy);assert.ok(a.time>a.duration);
});
test('Reiniciar crea estados nuevos sin cámara, accidente, puntos ni edificios ya contados',()=>{
  const first=new Flight(7);pilot(first,2);const next=new Flight(7);
  assert.equal(next.score,0);assert.equal(next.passed,0);assert.equal(next.camera.y,0);
  assert.equal(next.hit,null);assert.equal(next.elapsed,0);assert.ok(next.city.obstacles.every(b=>!b.passed));
});
test('Partículas se limitan y se eliminan al caducar',()=>{
  const ps=new Particles();for(let i=0;i<20;i++)ps.impact(0,0);
  assert.equal(ps.items.length,C.effects.maxParticles);for(let i=0;i<360;i++)ps.step(dt);
  assert.equal(ps.items.length,0);
});
test('Mismo resultado a 30, 60 y 144 FPS mediante pasos fijos',()=>{
  const run=fps=>{
    const f=new Flight(9);let acc=0,n=0;
    for(let frame=0;frame<fps*8;frame++){
      acc+=1/fps;while(acc>=dt-1e-12){f.step(dt,true,n===0?1:0);acc-=dt;n++;}
    }
    return {x:f.plane.x,y:f.plane.y,score:f.score};
  };
  assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(144));
});
