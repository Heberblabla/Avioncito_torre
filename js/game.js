(() => {
  'use strict';
  const C=AV.CONFIG,$=id=>document.getElementById(id),game=$('game');
  const renderer=new AV.Renderer($('sky')),sound=new AV.Sound();
  const panels=['menu','hud','pause','settings','gameover'];
  let state='menu',beforePause='running',flight=null,accident=null,best=0,runBest=0;
  let lastTime=0,accumulator=0,menuTime=0,smokeClock=0,shake=0,toastUntil=0,uiClock=0;
  let pendingTaps=0,gameoverAt=0,wasPortrait=false;
  const held=new Set();
  // Instrumento visible y optativo para pruebas locales: ?diagnostics.
  let diagnostic=null,frames=0,frameWindow=0;
  const manualClock=new URLSearchParams(location.search).has('manual-clock')&&new URLSearchParams(location.search).has('diagnostics');
  if(new URLSearchParams(location.search).has('diagnostics')){
    diagnostic=document.createElement('output');diagnostic.id='diagnostics';
    diagnostic.style.cssText='position:absolute;bottom:42px;left:24px;z-index:20;font:10px monospace;background:#f7f7f2;padding:6px;border:1px solid #ccc;pointer-events:none';
    game.append(diagnostic);
  }
  const settings={sound:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,fullscreen:true};
  try{
    best=Math.max(0,parseInt(localStorage.getItem(C.storage.best)||'0',10)||0);
    const saved=JSON.parse(localStorage.getItem(C.storage.settings)||'{}');
    for(const k of Object.keys(settings))if(typeof saved[k]==='boolean')settings[k]=saved[k];
  }catch{/* El juego funciona también cuando el navegador no permite guardar. */}
  const pad=(n,len=2)=>String(n).padStart(len,'0');
  function saveSettings(){try{localStorage.setItem(C.storage.settings,JSON.stringify(settings));}catch{}applySettings();}
  function applySettings(){
    sound.setEnabled(settings.sound);game.classList.toggle('reduced',settings.reduced);
    $('soundToggle').setAttribute('aria-checked',String(settings.sound));
    $('motionToggle').setAttribute('aria-checked',String(settings.reduced));
    $('fullscreenToggle').setAttribute('aria-checked',String(settings.fullscreen));
    $('menuSound').classList.toggle('muted',!settings.sound);
    $('menuSound').setAttribute('aria-label',settings.sound?'Silenciar sonido':'Activar sonido');
  }
  function resetInput(){held.clear();pendingTaps=0;}
  function setState(next){
    state=next;game.dataset.state=next;
    for(const p of panels)$(p).hidden=true;
    if(next==='menu'||next==='settings')$('menu').hidden=false;
    if(['running','crash','paused','gameover'].includes(next))$('hud').hidden=false;
    if(next==='settings')$('settings').hidden=false;
    if(next==='paused')$('pause').hidden=false;
    if(next==='gameover')$('gameover').hidden=false;
    $('skipCrash').hidden=next!=='crash';$('crashCaption').hidden=next!=='crash';
    $('pauseButton').disabled=!['running','crash'].includes(next);
    sound.wind(next==='running');
    if(next!=='running')resetInput();
  }
  function flash(){const el=$('transition');el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}
  function syncBest(){ $('menuBest').textContent=pad(best,5);$('runBest').textContent='RÉCORD '+pad(best,5); }
  async function fullscreen(){
    try{if(!document.fullscreenElement&&game.requestFullscreen)await game.requestFullscreen({navigationUI:'hide'});
      if(matchMedia('(pointer:coarse)').matches&&screen.orientation?.lock)await screen.orientation.lock('landscape');
    }catch{/* El aviso de giro sigue disponible si el navegador rechaza la API. */}
  }
  function startRun(launch=true){
    sound.unlock();if(settings.fullscreen&&matchMedia('(pointer:coarse)').matches)void fullscreen();
    flight=new AV.Flight((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);
    accident=null;accumulator=0;smokeClock=0;shake=0;toastUntil=0;uiClock=0;
    renderer.particles.clear();resetInput();runBest=best;
    $('notice').hidden=true;$('learningHint').hidden=false;$('counter').classList.remove('counter-pop');
    $('newRecord').hidden=true;$('crashCaption').textContent='';
    setState('running');pendingTaps=launch?1:0;syncBest();updateHUD();flash();
    if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
    if(isPortrait())pause();
  }
  function toMenu(){setState('menu');flight=null;accident=null;renderer.particles.clear();resetInput();syncBest();flash();$('play').focus({preventScroll:true});}
  function pause(){if(!['running','crash'].includes(state))return;beforePause=state;setState('paused');$('resume').focus({preventScroll:true});}
  function resume(){if(state!=='paused'||isPortrait())return;resetInput();accumulator=0;setState(beforePause);document.activeElement?.blur();}
  function record(){if(flight.score>best){best=flight.score;try{localStorage.setItem(C.storage.best,String(best));}catch{}syncBest();}}
  function crash(hit){
    accident=new AV.Accident(flight,renderer.anchor);record();sound.crash();shake=settings.reduced?0:C.crash.shake;
    renderer.particles.impact(hit.x,hit.y,settings.reduced);setState('crash');
    $('learningHint').hidden=true;$('notice').hidden=true;$('skipCrash').hidden=true;
    $('crashCaption').textContent=hit.kind==='ground'?'Eso era suelo.':'El edificio no se movió.';
  }
  function endRun(){
    setState('gameover');gameoverAt=performance.now();
    $('finalScore').textContent=pad(flight.score,5);$('finalPassed').textContent=flight.passed;
    $('finalStage').textContent=pad(flight.stage);$('finalBest').textContent=pad(best,5);
    const isRecord=flight.score>runBest;$('newRecord').hidden=!isRecord;
    $('overEyebrow').textContent=isRecord?'UN VUELO PARA RECORDAR':'ATERRIZAJE IMPROVISADO';
    $('overMessage').textContent=accident.buddyHit?'Al menos no aterrizaste solo.':flight.hit.kind==='ground'?'Un poco menos de tierra la próxima vez.':'El edificio tenía preferencia.';
    if(isRecord)sound.record();$('retry').focus({preventScroll:true});
  }
  function impulse(source){
    if(held.has(source))return;
    held.add(source);pendingTaps++;sound.boost();
    if(flight)renderer.particles.smoke(flight.plane,true);
  }
  function updateHUD(){
    if(!flight)return;
    $('score').textContent=pad(flight.score,5);
    const meta=flight.stageInfo;
    $('counter').textContent=pad(meta?.passed||0)+'/'+pad(meta?.total||0);
    $('stageLabel').textContent='ETAPA '+pad(flight.stage);
    $('routeProgress').style.width=((meta?.passed||0)/(meta?.total||1)*100)+'%';
    $('speedReadout').textContent='VELOCIDAD '+Math.round(flight.speed)+' u/s';
    $('flightStatus').textContent=state==='crash'?'VUELO INTERRUMPIDO':'MODO NORMAL / '+pad(flight.passed)+' EDIFICIOS';
    if(state!=='running')return;
    $('learningHint').hidden=flight.elapsed>7||flight.group!==null;
    if(toastUntil>flight.elapsed){
      $('notice').hidden=false;$('noticeTitle').textContent='ETAPA SUPERADA · +100';
      $('noticeSub').textContent='NUEVO HORIZONTE · ETAPA '+pad(flight.stage);
    } else if(flight.group && flight.plane.x<flight.group.end+40){
      const g=flight.group,seconds=Math.max(0,(g.start-flight.plane.x-36)/flight.speed);
      const high=flight.plane.y<C.view.ground-g.height-35;
      $('notice').hidden=false;
      $('noticeTitle').textContent=high?'MANTÉN LA ALTURA':'RASCACIELOS · PREPARA EL ASCENSO';
      $('noticeSub').textContent=high?'SUELTA POCO A POCO TRAS LAS TORRES':(seconds>0.2?'A '+seconds.toFixed(1)+' s · ':'')+'SUBE CON TOQUES RÁPIDOS';
    } else $('notice').hidden=true;
  }
  function fixedUpdate(dt){
    if(state==='running'){
      const taps=pendingTaps;pendingTaps=0;
      flight.step(dt,held.size>0,taps);
      smokeClock+=dt;
      if(held.size>0&&smokeClock>C.effects.smokeInterval){smokeClock=0;renderer.particles.smoke(flight.plane);}
      for(const e of flight.drainEvents()){
        if(e.type==='pass'){
          sound.pass(e.giant);$('counter').classList.remove('counter-pop');void $('counter').offsetWidth;$('counter').classList.add('counter-pop');
        }
        if(e.type==='stage'){sound.stage();toastUntil=flight.elapsed+2.6;record();}
        if(e.type==='crash')crash(e.hit);
      }
      renderer.particles.step(dt);
    }else if(state==='crash'){
      const result=accident.step(dt);
      if(result.impact){renderer.particles.impact(accident.buddyBuilding.x,accident.buddyY,settings.reduced);sound.crash();shake=settings.reduced?0:C.crash.shake;}
      renderer.particles.step(dt);
      $('skipCrash').hidden=accident.time<C.crash.retryDelay;
      $('crashCaption').textContent=accident.buddyHit?'Bueno. Éramos dos.':accident.buddy?'«Yo conozco un atajo».':flight.hit.kind==='ground'?'Eso era suelo.':'El edificio no se movió.';
      if(result.done)endRun();
    }
    shake=Math.max(0,shake-dt*20);
  }
  function frame(now){
    const dt=Math.min(C.physics.maxFrame,(now-lastTime)/1000||0);lastTime=now;
    if(state==='menu'||state==='settings')menuTime+=dt*(settings.reduced?0.4:1);
    if(!manualClock&&(state==='running'||state==='crash')){
      accumulator+=dt;let ticks=0;
      while(accumulator>=C.physics.fixedStep&&ticks++<9){fixedUpdate(C.physics.fixedStep);accumulator-=C.physics.fixedStep;}
    }else accumulator=0;
    uiClock+=dt;if(uiClock>0.09){uiClock=0;updateHUD();}
    renderer.draw({flight,accident,time:menuTime,menu:state==='menu'||state==='settings',reduced:settings.reduced,shake});
    if(diagnostic){frames++;if(now-frameWindow>1000){diagnostic.textContent=Math.round(frames*1000/(now-frameWindow))+' FPS · t '+(flight?.elapsed||0).toFixed(2)+' · x '+(flight?.plane.x||0).toFixed(0)+' · y '+(flight?.plane.y||0).toFixed(0)+' · cámara '+(flight?.camera.y||0).toFixed(0);frames=0;frameWindow=now;}}
    requestAnimationFrame(frame);
  }
  function isPortrait(){return innerHeight>innerWidth&& (matchMedia('(pointer:coarse)').matches||innerWidth<650);}
  function resize(){renderer.resize();const portrait=isPortrait();$('rotate').hidden=!portrait;if(portrait&&!wasPortrait)pause();wasPortrait=portrait;}

  $('play').addEventListener('click',startRun);$('retry').addEventListener('click',startRun);
  $('restart').addEventListener('click',startRun);$('overMenu').addEventListener('click',toMenu);$('pauseMenu').addEventListener('click',toMenu);
  $('pauseButton').addEventListener('click',pause);$('resume').addEventListener('click',resume);
  $('skipCrash').addEventListener('click',()=>{if(accident?.time>=C.crash.retryDelay)startRun();});
  $('options').addEventListener('click',()=>{setState('settings');$('soundToggle').focus({preventScroll:true});});
  $('closeSettings').addEventListener('click',()=>{setState('menu');$('options').focus({preventScroll:true});});
  $('soundToggle').addEventListener('click',()=>{settings.sound=!settings.sound;saveSettings();});
  $('menuSound').addEventListener('click',()=>{settings.sound=!settings.sound;saveSettings();});
  $('motionToggle').addEventListener('click',()=>{settings.reduced=!settings.reduced;saveSettings();});
  $('fullscreenToggle').addEventListener('click',()=>{settings.fullscreen=!settings.fullscreen;saveSettings();});
  $('menuFullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else void fullscreen();});
  game.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    if(isPortrait()||e.target.closest('button,.dialog'))return;
    if(state==='gameover'&&performance.now()-gameoverAt>250){e.preventDefault();startRun(false);impulse('pointer'+e.pointerId);return;}
    if(state==='crash'&&accident.time>=C.crash.retryDelay){e.preventDefault();startRun(false);impulse('pointer'+e.pointerId);return;}
    if(state==='running'){e.preventDefault();sound.unlock();impulse('pointer'+e.pointerId);try{game.setPointerCapture(e.pointerId);}catch{}}
  });
  const release=e=>held.delete('pointer'+e.pointerId);
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  game.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{
    if(e.code==='Tab'&&['paused','settings','gameover'].includes(state)){
      const panel=$(state==='paused'?'pause':state),buttons=[...panel.querySelectorAll('button:not([disabled])')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;
    }
    if(e.code==='KeyP'||e.code==='Escape'){
      if(state==='settings'){setState('menu');$('options').focus();}
      else if(state==='paused')resume();else pause();return;
    }
    if(e.code!=='Space'||e.repeat||isPortrait())return;
    if(state==='settings')return;
    if(state==='menu'&&e.target.closest('button'))return;
    e.preventDefault();sound.unlock();
    if(state==='menu'||state==='gameover'){startRun(false);impulse('space');}
    else if(state==='running')impulse('space');
    else if(state==='crash'&&accident.time>=C.crash.retryDelay){startRun(false);impulse('space');}
    else if(state==='paused')resume();
  });
  document.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();held.delete('space');}});
  window.addEventListener('blur',()=>{resetInput();pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();}lastTime=performance.now();});
  window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
  new ResizeObserver(resize).observe(game);
  // Reloj de pruebas por eventos, únicamente con ?diagnostics&manual-clock.
  // Permite probar entradas DOM aunque el navegador de QA limite requestAnimationFrame.
  if(diagnostic&&manualClock)game.addEventListener('avioncito:advance',e=>{
    const seconds=AV.clamp(Number(e.detail)||0,0,10);
    for(let i=0;i<Math.round(seconds/C.physics.fixedStep);i++)fixedUpdate(C.physics.fixedStep);
    updateHUD();renderer.draw({flight,accident,time:menuTime,menu:state==='menu'||state==='settings',reduced:settings.reduced,shake});
    diagnostic.textContent='RELOJ DE PRUEBAS · t '+(flight?.elapsed||0).toFixed(2)+' · x '+(flight?.plane.x||0).toFixed(0)+' · y '+(flight?.plane.y||0).toFixed(0)+' · cámara '+(flight?.camera.y||0).toFixed(0);
  });
  applySettings();syncBest();resize();requestAnimationFrame(frame);
})();
