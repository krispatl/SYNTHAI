// SOUL SYNTH COMPOSER (Enhanced Edition — No AI)
// -------------------------------------------------
const canvas = document.getElementById("synthCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// -------------------------------- SOUND SYSTEM --------------------------------
const filter = new Tone.Filter(800, "lowpass").toDestination();
const reverb = new Tone.Reverb({ decay: 3, wet: 0.4 }).connect(filter);
const echo = new Tone.FeedbackDelay("8n", 0.4).connect(reverb);
let synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sawtooth" },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
}).connect(echo);

const drone = new Tone.Oscillator("C3", "sine").connect(filter);
drone.volume.value = -12;

const lfoFilter = new Tone.LFO("0.05hz", 400, 2000).connect(filter.frequency).start();
const lfoPan = new Tone.LFO("0.1hz", -1, 1).start();

let drawing = false;
let currentPath = [];
let trails = [];
let pulses = [];
let glyphs = [];
let handLandmarks = [];
let activeEntity = "The Archivist";
let lastTrigger = 0;

// -------------------------------- ENTITIES --------------------------------
const entityConfigs = {
  "The Archivist": {
    scale: ["C3", "E3", "G3", "B3", "D4"],
    droneFreq: "C3",
    reverb: 3,
    filterFreq: 800,
    synthType: "sawtooth",
    colorHue: 200
  },
  "The Blooming Core": {
    scale: ["A3", "C4", "D4", "F4", "G4"],
    droneFreq: "A2",
    reverb: 2,
    filterFreq: 1000,
    synthType: "fm",
    colorHue: 120
  },
  "Entity Δ14": {
    scale: ["D3", "F3", "A3", "C4", "E4"],
    droneFreq: "F#2",
    reverb: 4,
    filterFreq: 500,
    synthType: "am",
    colorHue: 300
  }
};

// -------------------------------- SETUP --------------------------------
document.getElementById("entitySelect").addEventListener("change", (e) => {
  activeEntity = e.target.value;
  updateFX();
});

document.getElementById("startButton").addEventListener("click", async () => {
  await Tone.start();
  drone.start();
  updateFX();
  try {
    await setupHandTracking();
  } catch (err) {
    console.warn("🛑 Camera access denied or failed:", err);
  }
});

// -------------------------------- AUDIO FX --------------------------------
function updateFX() {
  const c = entityConfigs[activeEntity];
  reverb.decay = c.reverb;
  filter.frequency.value = c.filterFreq;
  drone.frequency.value = c.droneFreq;
  synth.set({ oscillator: { type: c.synthType } });
}

// -------------------------------- DRAWING CONTROLS --------------------------------
function getXY(e) {
  if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function startDrawing(e) {
  drawing = true;
  const { x, y } = getXY(e);
  currentPath = [{ x, y, hue: Math.random() * 360 }];
  triggerNote(x, y);
}
function drawMove(e) {
  if (!drawing) return;
  const { x, y } = getXY(e);
  currentPath.push({ x, y, hue: Math.random() * 360 });
  triggerNote(x, y);
}
function stopDrawing() {
  drawing = false;
  if (currentPath.length > 1) trails.push({ path: currentPath, life: 60 });
  currentPath = [];
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", drawMove);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", drawMove, { passive: false });
canvas.addEventListener("touchend", stopDrawing);

// -------------------------------- NOTES --------------------------------
function triggerNote(x, y, noteOverride = null) {
  const now = Tone.now();
  if (now - lastTrigger < 0.2) return;
  lastTrigger = now;

  const scale = entityConfigs[activeEntity].scale;
  const dx = x - canvas.width / 2;
  const dy = y - canvas.height / 2;
  const angle = Math.atan2(dy, dx);
  const index = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * scale.length);
  const note = noteOverride || scale[index % scale.length];
  const velocity = 0.6 + (1 - y / canvas.height) * 0.4;

  synth.triggerAttackRelease(note, "8n", undefined, velocity);
  synth.triggerAttackRelease(note, "8n", now + 0.5, velocity * 0.3);
  pulses.push({ x, y, radius: 0 });
}

function pickGlyph() {
  const symbols = ["✶", "☍", "⟁", "⧫", "◬", "⨀", "⧉", "❖", "⌖"];
  return symbols[Math.floor(Math.random() * symbols.length)];
}

// -------------------------------- VISUAL LOOP --------------------------------
function draw() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "lighter";

  const hue = entityConfigs[activeEntity].colorHue;
  const hueShift = Math.sin(Date.now() / 1000) * 30;

  // Trails
  for (let i = trails.length - 1; i >= 0; i--) {
    const trail = trails[i];
    ctx.beginPath();
    for (let j = 0; j < trail.path.length; j++) {
      const p = trail.path[j];
      if (j === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    const alpha = trail.life / 60;
    ctx.strokeStyle = `hsla(${hue + hueShift}, 100%, 70%, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = `hsla(${hue + hueShift},100%,70%,0.6)`;
    ctx.stroke();
    trail.life--;
    if (trail.life <= 0) trails.splice(i, 1);
  }

  // Pulses
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(255,255,255,${1 - p.radius / 30})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    p.radius += 2;
    if (p.radius > 30) pulses.splice(i, 1);
  }

  // Glyphs
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  for (let i = glyphs.length - 1; i >= 0; i--) {
    const g = glyphs[i];
    ctx.fillStyle = `rgba(255,255,255,${g.alpha})`;
    ctx.fillText(g.char, g.x, g.y);
    g.y -= 0.5;
    g.alpha -= 0.01;
    if (g.alpha <= 0) glyphs.splice(i, 1);
  }

  drawSkeleton();
  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(draw);
}

// -------------------------------- HAND TRACKING --------------------------------
const videoElement = document.getElementById("inputVideo");

async function setupHandTracking() {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });
  hands.onResults(onResults);

  const camera = new Camera(videoElement, {
    onFrame: async () => await hands.send({ image: videoElement }),
    width: 640,
    height: 480,
  });
  camera.start();
}

function onResults(results) {
  if (results.multiHandLandmarks.length > 0) {
    handLandmarks = results.multiHandLandmarks[0];
    interpretGestures(handLandmarks);
  } else {
    handLandmarks = [];
  }
}

function interpretGestures(hand) {
  const tips = [4, 8, 12, 16, 20];
  const scale = entityConfigs[activeEntity].scale;

  // Pinch detection (thumb + index)
  const thumb = hand[4], index = hand[8];
  const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  if (pinchDist < 0.04) triggerGlyphBurst();

  // Open palm modulation
  const palm = hand[0];
  const xNorm = palm.x * 2 - 1;
  const yNorm = 1 - palm.y;
  const cutoff = 300 + (1 - yNorm) * 1000;
  const volume = -40 + (1 - yNorm) * 30;
  filter.frequency.linearRampTo(cutoff, 0.1);
  drone.volume.linearRampTo(volume, 0.1);
  synth.set({ pan: xNorm });

  // Trigger notes from fingertips
  tips.forEach((idx, i) => {
    const point = hand[idx];
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    const note = scale[i % scale.length];
    triggerNote(x, y, note);
    glyphs.push({ x, y, alpha: 1, char: pickGlyph() });
  });
}

function triggerGlyphBurst() {
  for (let i = 0; i < 10; i++) {
    glyphs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      alpha: 1,
      char: pickGlyph()
    });
  }
}

// -------------------------------- HAND SKELETON --------------------------------
function drawSkeleton() {
  if (!handLandmarks.length) return;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.5;
  const conns = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
  ];
  for (const [i, j] of conns) {
    const a = handLandmarks[i];
    const b = handLandmarks[j];
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.stroke();
  }
  for (const p of handLandmarks) {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,255,255,0.6)";
    ctx.fill();
  }
}

draw();
