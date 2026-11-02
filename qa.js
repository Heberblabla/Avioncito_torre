(() => {
  const $=id=>document.getElementById(id),C=AV.CONFIG,renderer=new AV.Renderer($('scene'));
  let flight=new AV.Flight(13),accident=null,running=false,clock=0,last=0;
  function show(){ $('view').style.display='block';$('embed').style.display='none';renderer.resize(); }
  function pilot(to){
    flight=new AV.Flight(13);accident=null;let lastTap=-1;
    while(flight.plane.x<to&&flight.state==='running'){
      const g=flight.city.specialAt(flight.plane.x),target=g&&flight.plane.x<g.end+80?C.view.ground-g.height-75:186;
      const need=flight.plane.y+flight.plane.vy*.3>target,tap=need&&flight.elapsed-lastTap>=.215;
      if(tap)lastTap=flight.elapsed;
      flight.step(C.physics.fixedStep,need&&flight.elapsed-lastTap<.085,tap?1:0);flight.drainEvents();
    }
  }
  function draw(){renderer.draw({flight,accident,time:0});$('readout').textContent=`${flight.passed} edificios · ${flight.score} puntos · cámara ${Math.round(flight.camera.y)} · ${flight.state}`;}
  function scene(kind){
    running=false;show();renderer.particles.clear();flight=new AV.Flight(13);const g=flight.city.specials[0];
    if(kind==='normal')pilot(1400);
    if(kind==='climb')pilot(g.start-510);
    if(kind==='return')pilot(g.end+1450);
    if(kind==='double'){
      pilot(g.start-350);const b=flight.city.obstacles.find(b=>b.giant);
      flight.plane.x=b.x-26;flight.plane.y=C.view.ground-b.h+180;flight.plane.vy=0;flight.plane.angle=0;
      flight.camera.y=flight.plane.y-235;flight.step(C.physics.fixedStep);
      accident=new AV.Accident(flight,renderer.anchor);clock=0;
      renderer.particles.impact(flight.hit.x,flight.hit.y);
      while(clock<3.1){clock+=C.physics.fixedStep;const event=accident.step(C.physics.fixedStep);renderer.particles.step(C.physics.fixedStep);if(event.impact)renderer.particles.impact(accident.buddyBuilding.x,accident.buddyY);}
    }
    $('report').textContent=kind==='double'?'Secuencia del segundo avión. Se detiene al quedar ambos incrustados.':'Escenario calculado con toques de 85 ms, separados 215 ms, y las físicas del juego.';draw();
  }
  function frame(now){const dt=Math.min(.06,(now-last)/1000||0);last=now;if(running){clock+=dt;const result=accident.step(dt);renderer.particles.step(dt);if(result.impact)renderer.particles.impact(accident.buddyBuilding.x,accident.buddyY);draw();if(clock>3.1)running=false;}requestAnimationFrame(frame);}
  function size(w,h,manual=false){running=false;$('view').style.display='none';$('embed').style.display='block';$('embed').style.width=w+'px';$('embed').style.height=h+'px';$('report').textContent=`Juego real en un marco de ${w} × ${h}.`;$('embed').src='./index.html?diagnostics'+(manual?'&manual-clock':'');}
  for(const id of ['normal','climb','return','double'])$(id).onclick=()=>scene(id);
  $('desktop').onclick=()=>size(1280,720);$('mobile').onclick=()=>size(844,390);$('portrait').onclick=()=>size(390,844);
  $('controls').onclick=async()=>{
    size(844,390,true);const iframe=$('embed');await new Promise(resolve=>iframe.onload=resolve);
    const w=iframe.contentWindow,d=w.document,results=[];
    const advance=seconds=>d.getElementById('game').dispatchEvent(new w.CustomEvent('avioncito:advance',{detail:seconds}));
    const oldBest=w.localStorage.getItem(AV.CONFIG.storage.best);
    const check=(value,label)=>{results.push((value?'PASS ':'FAIL ')+label);$('report').textContent=results.join('\n');};
    d.getElementById('play').click();
    const el=d.getElementById('game');
    for(let i=0;i<8;i++){
      el.dispatchEvent(new w.PointerEvent('pointerdown',{pointerId:7,pointerType:'touch',button:0,bubbles:true}));
      advance(.075);w.dispatchEvent(new w.PointerEvent('pointerup',{pointerId:7,pointerType:'touch',bubbles:true}));advance(.14);
    }
    check(el.dataset.state==='running','8 toques táctiles rápidos sin detener el vuelo');
    check(parseInt(d.getElementById('diagnostics').textContent.match(/· y (-?\d+)/)[1],10)<220,'Los toques realmente elevan el avión');
    el.dispatchEvent(new w.PointerEvent('pointerdown',{pointerId:7,pointerType:'touch',button:0,bubbles:true}));
    advance(6);w.dispatchEvent(new w.PointerEvent('pointerup',{pointerId:7,pointerType:'touch',bubbles:true}));
    check(el.dataset.state==='running','Mantener pulsado durante 6 segundos');
    check(parseInt(d.getElementById('score').textContent,10)>0,'Edificios reales superados con el control táctil');
    d.getElementById('pauseButton').click();check(el.dataset.state==='paused','Pausar libera la entrada táctil');
    advance(3);check(el.dataset.state==='paused','El tiempo de pausa no mueve el juego');
    d.getElementById('restart').click();check(d.getElementById('score').textContent==='00000','Reiniciar borra puntos');
    check(d.getElementById('counter').textContent.startsWith('00/'),'Reiniciar borra contador de etapa');
    advance(5);check(el.dataset.state==='gameover','Caída, accidente y pantalla de resultados');
    const keyboard=new w.KeyboardEvent('keydown',{code:'Space',bubbles:true});d.dispatchEvent(keyboard);
    check(el.dataset.state==='running','Espacio reinicia desde Game Over');
    d.dispatchEvent(new w.KeyboardEvent('keyup',{code:'Space',bubbles:true}));
    d.getElementById('pauseButton').click();
    check(d.documentElement.scrollWidth===844,'Sin desbordamiento horizontal en móvil');
    check(d.getElementById('sky').getBoundingClientRect().width===844,'Canvas ocupa el ancho en paisaje');
    if(oldBest===null)w.localStorage.removeItem(AV.CONFIG.storage.best);else w.localStorage.setItem(AV.CONFIG.storage.best,oldBest);
  };
  scene('normal');requestAnimationFrame(frame);
})();
