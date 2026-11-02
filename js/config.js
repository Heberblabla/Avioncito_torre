/* Todos los valores de jugabilidad están en unidades lógicas y segundos. */
globalThis.AV = globalThis.AV || {};
AV.CONFIG = Object.freeze({
  view: { height: 600, ground: 528, playerX: 0.245, maxDpr: 2 },
  physics: {
    gravity: 360, tapImpulse: 112, tapResponse: 0.075, holdThrust: 390,
    drag: 1.05, maxFall: 285, maxRise: 290, fixedStep: 1 / 120,
    maxFrame: 0.06, cruiseCeiling: 84, ceilingFade: 105, ceilingSpring: 16, tiltResponse: 8,
    minTilt: -0.31, maxTilt: 0.46, initialY: 274, initialVy: -20
  },
  difficulty: { initialSpeed: 165, speedPerStage: 9, maxSpeed: 225, heightPerStage: 9, maxLevel: 8 },
  obstacles: {
    firstX: 790, minWidth: 42, maxWidth: 78, minHeight: 65, maxHeight: 224,
    absoluteMaxHeight: 282, maxHeightChange: 72, minGap: 290, maxGap: 390,
    gapReductionPerStage: 9, minimumGap: 238, stageMinNormals: 18, stageMaxNormals: 23,
    giantEvery: 15, giantMinHeight: 610, giantMaxHeight: 690,
    giantHeightPerLevel: 20, giantMaxLimit: 810, giantWidth: 58,
    twinProbability: 1, twinGap: 12, giantHeadroom: 165,
    minimumRunup: 1160, reactionSeconds: 1.35, recoverySeconds: 1.55,
    safeClimbFraction: 0.55, giantExitGap: 530, retainBehind: 450,
    generationAhead: 2100
  },
  camera: { response: 3.1, maxSpeed: 220, followY: 0.39, returnY: 140, bottomMargin: 110, exitDistance: 340, anticipation: 0.62 },
  crash: { normalDuration: 1.65, giantDuration: 3.85, retryDelay: 0.45, buddyDelay: 1.05, buddyFlight: 1.55, shake: 6 },
  effects: { maxParticles: 200, smokeInterval: 0.075, impactCount: 32, transition: 0.3 },
  score: { normal: 10, giant: 35, stageBonus: 100 },
  storage: { best: 'avioncito.best.v1', settings: 'avioncito.settings.v1' }
});
