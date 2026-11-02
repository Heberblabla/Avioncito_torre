/* Núcleo independiente del DOM: física, geometría, etapas y cámara. */
(() => {
  'use strict';
  const C = AV.CONFIG;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
  class Random {
    constructor(seed = Date.now()) { this.seed = seed >>> 0; }
    next() {
      let t = this.seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    between(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(this.between(a, b + 1)); }
  }
  // Las mismas piezas se usan para dibujar y para colisionar. Nada de una caja gigante.
  const PLANE = [
    [[-31,-7],[17,-7],[17,6],[-23,6],[-31,2]],
    [[17,-3],[26,-3],[32,2],[28,6],[17,6]],
    [[-31,-7],[-34,-22],[-28,-22],[-18,-7]],
    [[-5,3],[9,3],[1,15],[-12,15]],
    [[-18,-7],[-9,-12],[19,-12],[23,-8],[17,-7]]
  ];
  function planePolygons(p, inset = 1) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    return PLANE.map(poly => poly.map(([x,y]) => ({x:p.x+(x*c-y*s)*inset,y:p.y+(x*s+y*c)*inset})));
  }
  function polygonRect(poly, r) {
    const corners = [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
    const axes = [{x:1,y:0},{x:0,y:1}];
    for (let i=0;i<poly.length;i++) {
      const a=poly[i], b=poly[(i+1)%poly.length]; axes.push({x:-(b.y-a.y),y:b.x-a.x});
    }
    return axes.every(a => {
      let pmin=Infinity,pmax=-Infinity,rmin=Infinity,rmax=-Infinity;
      for(const p of poly) { const n=p.x*a.x+p.y*a.y; pmin=Math.min(pmin,n);pmax=Math.max(pmax,n); }
      for(const p of corners) { const n=p.x*a.x+p.y*a.y; rmin=Math.min(rmin,n);rmax=Math.max(rmax,n); }
      return !(pmax<rmin || rmax<pmin);
    });
  }
  function collision(plane, obstacles) {
    const polys=planePolygons(plane,0.94);
    for(const poly of polys) if(poly.some(p=>p.y>=C.view.ground)) return {kind:'ground',x:plane.x,y:C.view.ground};
    for(const b of obstacles) {
      if(b.x>plane.x+40 || b.x+b.w<plane.x-40) continue;
      const rect={x:b.x,y:C.view.ground-b.h,w:b.w,h:b.h};
      if(polys.some(poly=>polygonRect(poly,rect))) return {kind:'building',building:b,x:b.x,y:Math.max(rect.y,plane.y)};
    }
    return null;
  }
  function difficulty(stage) {
    const level=clamp(stage-1,0,C.difficulty.maxLevel);
    return { level, speed:Math.min(C.difficulty.maxSpeed,C.difficulty.initialSpeed+level*C.difficulty.speedPerStage) };
  }
  function runupFor(height) {
    // Se reserva distancia usando la velocidad MÁXIMA, caída adversa y ascenso conservador.
    const t=height/(C.physics.maxRise*C.obstacles.safeClimbFraction)+C.obstacles.reactionSeconds+C.obstacles.recoverySeconds;
    return Math.max(C.obstacles.minimumRunup, Math.ceil(C.difficulty.maxSpeed*t));
  }
  class City {
    constructor(seed) {
      this.rng=new Random(seed);this.obstacles=[];this.specials=[];this.stages=new Map();
      this.nextX=C.obstacles.firstX;this.stageNumber=0;this.normalsSinceGiant=0;this.id=0;this.lastHeight=100;
      this.generateStage();
    }
    generateStage() {
      const stage=++this.stageNumber, d=difficulty(stage), cfg=C.obstacles;
      const meta={number:stage,total:0,passed:0}; this.stages.set(stage,meta);
      const count=this.rng.int(cfg.stageMinNormals,cfg.stageMaxNormals);
      const add=(w,h,giant=false,group=null)=>{
        const b={id:++this.id,x:this.nextX,w,h,giant,group,stage,passed:false,variant:this.rng.int(0,3)};
        this.obstacles.push(b);meta.total++;this.nextX+=w;return b;
      };
      for(let i=0;i<count;i++) {
        const min=cfg.minHeight+Math.min(d.level*4,30);
        const max=Math.min(cfg.absoluteMaxHeight,cfg.maxHeight+d.level*C.difficulty.heightPerStage);
        let height=this.rng.int(min,max);
        if(this.id<4) height=this.rng.int(68,125);
        height=clamp(height,this.lastHeight-cfg.maxHeightChange,this.lastHeight+cfg.maxHeightChange);
        this.lastHeight=height;
        add(this.rng.int(cfg.minWidth,cfg.maxWidth),height);
        this.normalsSinceGiant++;
        if(this.normalsSinceGiant>=cfg.giantEvery) {
          this.normalsSinceGiant=0;
          const h=Math.min(cfg.giantMaxLimit,this.rng.int(cfg.giantMinHeight,cfg.giantMaxHeight)+d.level*cfg.giantHeightPerLevel);
          const lead=runupFor(h);
          this.nextX+=lead;
          const group={id:this.id+1,start:this.nextX,end:0,height:h,lead};
          add(cfg.giantWidth,h,true,group.id);
          if(this.rng.next()<cfg.twinProbability) {
            this.nextX+=cfg.twinGap; add(cfg.giantWidth,h,true,group.id);
          }
          group.end=this.nextX;this.specials.push(group);
          this.nextX+=cfg.giantExitGap;
        } else {
          const minGap=Math.max(cfg.minimumGap,cfg.minGap-d.level*cfg.gapReductionPerStage);
          this.nextX+=this.rng.int(minGap,cfg.maxGap-d.level*5);
        }
      }
      return meta;
    }
    maintain(x) {
      if(this.nextX<x+C.obstacles.generationAhead) this.generateStage();
      this.obstacles=this.obstacles.filter(b=>b.x+b.w>x-C.obstacles.retainBehind);
      this.specials=this.specials.filter(g=>g.end>x-C.obstacles.retainBehind);
      for(const [n,m] of this.stages) if(n<this.stageNumber-2 && m.passed===m.total) this.stages.delete(n);
    }
    specialAt(x) { return this.specials.find(g=>x>g.start-g.lead && x<g.end+C.camera.exitDistance)||null; }
  }
  class Camera {
    constructor() { this.y=0;this.target=0; }
    update(p, group, dt) {
      let target=0;
      if(group) {
        const progress=clamp(1-(group.start-p.x)/group.lead,0,1);
        const preview=Math.max(C.view.ground-group.height-100,p.y-(C.view.height-C.camera.bottomMargin));
        target=Math.min(0,p.y-C.view.height*C.camera.followY,preview*progress*C.camera.anticipation);
      } else if(p.y<C.camera.returnY) {
        // La cámara acompaña el descenso: nunca deja al avión fuera de pantalla.
        target=Math.min(0,p.y-C.camera.returnY);
      }
      // Solo se permite acompañamiento alto si venimos de una zona de torres.
      if(!group && this.y===0) target=0;
      this.target=target;
      const delta=approach(this.y,target,C.camera.response,dt)-this.y;
      this.y+=clamp(delta,-C.camera.maxSpeed*dt,C.camera.maxSpeed*dt);
      if(!group && Math.abs(this.y)<0.06) this.y=0;
    }
  }
  class Flight {
    constructor(seed=Date.now(), mode='normal') {
      if(mode!=='normal') throw new Error('Modo aún no disponible');
      this.mode=mode;this.seed=seed;this.city=new City(seed);this.camera=new Camera();
      this.plane={x:0,y:C.physics.initialY,vy:C.physics.initialVy,angle:0,lift:0};
      this.elapsed=0;this.stage=1;this.passed=0;this.score=0;this.speed=C.difficulty.initialSpeed;
      this.state='running';this.events=[];this.group=null;this.hit=null;
    }
    step(dt, held=false, taps=0) {
      if(this.state!=='running') return;
      this.elapsed+=dt;
      const p=this.plane, f=C.physics;
      this.city.maintain(p.x);
      this.group=this.city.specialAt(p.x);
      const ceiling=this.group?C.view.ground-this.group.height-C.obstacles.giantHeadroom:f.cruiseCeiling;
      const liftFactor=clamp((p.y-ceiling)/f.ceilingFade,0,1);
      if(taps) p.lift+=f.tapImpulse*Math.min(taps,5)*liftFactor;
      p.lift=Math.min(p.lift,f.tapImpulse*4);
      const burst=p.lift*(1-Math.exp(-dt/f.tapResponse));p.lift-=burst;
      const ceilingPressure=Math.max(0,ceiling-p.y)*f.ceilingSpring;
      p.vy=clamp((p.vy+(f.gravity+ceilingPressure-(held?f.holdThrust*liftFactor:0))*dt-burst*liftFactor)*Math.exp(-f.drag*dt),-f.maxRise,f.maxFall);
      p.y+=p.vy*dt;
      this.speed=approach(this.speed,difficulty(this.stage).speed,1.5,dt);
      p.x+=this.speed*dt;
      const tilt=clamp(p.vy/650,f.minTilt,f.maxTilt);
      p.angle=approach(p.angle,tilt,f.tiltResponse,dt);
      const hit=collision(p,this.city.obstacles);
      if(hit) { this.state='crashed';this.hit=hit;this.events.push({type:'crash',hit});return; }
      for(const b of this.city.obstacles) {
        if(!b.passed && p.x-37>b.x+b.w) {
          b.passed=true;this.passed++;
          this.score+=b.giant?C.score.giant:C.score.normal;
          const meta=this.city.stages.get(b.stage);meta.passed++;
          this.events.push({type:'pass',giant:b.giant});
          if(meta.passed===meta.total) {
            this.score+=C.score.stageBonus;this.stage=b.stage+1;
            if(!this.city.stages.has(this.stage))this.city.generateStage();
            this.events.push({type:'stage',stage:this.stage});
          }
        }
      }
      this.camera.update(p,this.group,dt);
    }
    drainEvents() { return this.events.splice(0); }
    get stageInfo() { return this.city.stages.get(this.stage); }
  }
  class Accident {
    constructor(flight, screenAnchor=250) {
      const hit=flight.hit,p=flight.plane;
      this.time=0;this.hit=hit;this.initial={...p};this.plane={...p};this.buddy=null;this.buddyHit=false;
      this.giant=!!hit.building?.giant;
      // El segundo avión busca la otra torre del mismo par.
      const siblings=this.giant?flight.city.obstacles.filter(b=>b.giant&&b.group===hit.building.group&&b.id!==hit.building.id):[];
      this.buddyBuilding=siblings.find(b=>b.x>hit.building.x)||siblings[0]||null;
      this.duration=this.buddyBuilding?C.crash.giantDuration:C.crash.normalDuration;
      const top=hit.building?C.view.ground-hit.building.h:hit.kind==='obstacle'?hit.y:C.view.ground;
      this.wall=hit.kind==='building'&&p.x<hit.building.x+18&&p.y>top+5;
      this.anchor=this.wall?{x:hit.building.x+4,y:clamp(p.y+5,top+18,C.view.ground-24)}:{x:p.x+15,y:top+4};
      this.startX=p.x-screenAnchor-90;
      this.buddyY=clamp(this.anchor.y+94,top+48,C.view.ground-45);
    }
    step(dt) {
      this.time+=dt;
      const t=this.time, a=approach(this.initial.angle,this.wall?0.62:1.15,9,t);
      this.plane.angle=a;
      this.plane.x=lerp(this.initial.x,this.anchor.x-32*Math.cos(a),clamp(t*9,0,1));
      this.plane.y=lerp(this.initial.y,this.anchor.y-32*Math.sin(a),clamp(t*9,0,1));
      let impact=false;
      if(this.buddyBuilding&&t>=C.crash.buddyDelay) {
        const f=clamp((t-C.crash.buddyDelay)/C.crash.buddyFlight,0,1);
        const endX=this.buddyBuilding.x-24;
        this.buddy={x:lerp(this.startX,endX,f),y:this.buddyY+Math.sin(f*Math.PI)*-12,angle:0.05,scale:0.8};
        if(f===1) {
          if(!this.buddyHit){this.buddyHit=true;impact=true;}
          const a=approach(0.05,0.61,12,t-C.crash.buddyDelay-C.crash.buddyFlight);
          this.buddy.angle=a;this.buddy.x=this.buddyBuilding.x+3-32*0.8*Math.cos(a);
          this.buddy.y=this.buddyY-32*0.8*Math.sin(a);
        }
      }
      return {impact,done:t>=this.duration};
    }
  }
  Object.assign(AV,{clamp,lerp,approach,Random,PLANE,planePolygons,polygonRect,collision,difficulty,runupFor,City,Camera,Flight,Accident});
})();
