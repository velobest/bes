/* --- Quantum Dodge Game --- */
const canvas = document.getElementById('quantum-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const PLAYER = { x: W / 2, y: H - 90, r: 14, vx: 0, speed: 520, colorA: '#00ffe0', colorB: '#ff29a8' };
  const STATE = { running: true, over: false, score: 0, combo: 1, comboTimer: 0, time: 0, difficulty: 1, slowmo: 0, shield: 0 };
  const orbs = [], hazards = [], powerups = [];
  const INPUT = { left: false, right: false, pointerId: null, dragX: null };

  function rand(min, max) { return Math.random() * (max - min) + min; }

  /* Controls */
  function onKey(e, down) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') INPUT.left = down;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') INPUT.right = down;
    if (down && e.code === 'KeyP') togglePause();
    if (down && e.code === 'KeyR') restart();
  }
  window.addEventListener('keydown', e => onKey(e, true));
  window.addEventListener('keyup', e => onKey(e, false));

  canvas.addEventListener('pointerdown', e => { INPUT.pointerId = e.pointerId; INPUT.dragX = e.clientX; });
  window.addEventListener('pointermove', e => {
    if (INPUT.pointerId === e.pointerId && INPUT.dragX != null) {
      const dx = e.clientX - INPUT.dragX; INPUT.dragX = e.clientX; PLAYER.x += dx * 1.1;
    }
  });
  window.addEventListener('pointerup', e => { if (INPUT.pointerId === e.pointerId) { INPUT.pointerId = null; INPUT.dragX = null; } });

  document.getElementById('qd-pause').onclick = togglePause;
  document.getElementById('qd-restart').onclick = restart;

  function togglePause() { if (!STATE.over) STATE.running = !STATE.running; }
  function restart() {
    saveScore();
    Object.assign(STATE, { running: true, over: false, score: 0, combo: 1, comboTimer: 0, time: 0, difficulty: 1, slowmo: 0, shield: 0 });
    PLAYER.x = W / 2; PLAYER.vx = 0;
    orbs.length = hazards.length = powerups.length = 0;
  }

  /* Entities */
  function spawnOrb() { orbs.push({ x: rand(30, W - 30), y: -20, r: 8, vy: rand(110, 180) * STATE.difficulty, hue: rand(170, 200) }); }
  function spawnHazard() { hazards.push({ x: rand(30, W - 30), y: -24, r: rand(10, 16), vy: rand(180, 280) * (0.7 + 0.3 * STATE.difficulty), rot: rand(0, Math.PI * 2), spin: rand(-2, 2), hue: rand(310, 330) }); }
  function spawnPowerup() { powerups.push({ type: Math.random() < 0.5 ? 'slow' : 'shield', x: rand(30, W - 30), y: -22, r: 10, vy: rand(130, 180) }); }

  function circleCollide(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy < (a.r + b.r) ** 2; }

  /* Game Loop */
  let last = performance.now();
  function loop(t) {
    const dt = (t - last) / 1000; last = t;
    if (STATE.running && !STATE.over) update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function update(dt) {
    let dts = dt * (STATE.slowmo > 0 ? 0.4 : 1);
    STATE.time += dts; STATE.score += dts * 10 * STATE.combo;
    if (STATE.comboTimer > 0) { STATE.comboTimer -= dts; if (STATE.comboTimer <= 0) STATE.combo = 1; }
    if (STATE.slowmo > 0) STATE.slowmo -= dt; if (STATE.shield > 0) STATE.shield -= dt;
    STATE.difficulty = 1 + STATE.time / 60;

    if (INPUT.left) PLAYER.vx = -PLAYER.speed; else if (INPUT.right) PLAYER.vx = PLAYER.speed; else PLAYER.vx = 0;
    PLAYER.x += PLAYER.vx * dts; PLAYER.x = Math.max(20, Math.min(W - 20, PLAYER.x));

    if (Math.random() < 0.03 * STATE.difficulty) spawnOrb();
    if (Math.random() < 0.025 * STATE.difficulty) spawnHazard();
    if (Math.random() < 0.005 * STATE.difficulty) spawnPowerup();

    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]; o.y += o.vy * dts;
      if (circleCollide(PLAYER, o)) { STATE.score += 50 * STATE.combo; STATE.combo++; STATE.comboTimer = 3; orbs.splice(i, 1); }
      else if (o.y > H + 30) orbs.splice(i, 1);
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i]; h.y += h.vy * dts; h.rot += h.spin * dts;
      if (circleCollide(PLAYER, h)) {
        if (STATE.shield > 0) hazards.splice(i, 1);
        else { STATE.over = true; STATE.running = false; }
      } else if (h.y > H + 40) hazards.splice(i, 1);
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i]; p.y += p.vy * dts;
      if (circleCollide(PLAYER, p)) {
        if (p.type === 'slow') STATE.slowmo = 6;
        else STATE.shield = 6;
        powerups.splice(i, 1);
      } else if (p.y > H + 40) powerups.splice(i, 1);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    // player
    const g = ctx.createLinearGradient(PLAYER.x - PLAYER.r, PLAYER.y - PLAYER.r, PLAYER.x + PLAYER.r, PLAYER.y + PLAYER.r);
    g.addColorStop(0, PLAYER.colorA); g.addColorStop(1, PLAYER.colorB);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(PLAYER.x, PLAYER.y, PLAYER.r, 0, Math.PI * 2); ctx.fill();
    if (STATE.shield > 0) { ctx.strokeStyle = 'rgba(0,255,224,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(PLAYER.x, PLAYER.y, PLAYER.r + 6, 0, Math.PI * 2); ctx.stroke(); }
    // orbs
    for (const o of orbs) { ctx.fillStyle = `hsl(${o.hue},100%,60%)`; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); }
    // hazards
    for (const h of hazards) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.fillStyle = `hsl(${h.hue},100%,55%)`; ctx.beginPath(); ctx.moveTo(-h.r, -h.r); ctx.lineTo(h.r, 0); ctx.lineTo(-h.r, h.r); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // powerups
    for (const p of powerups) { ctx.fillStyle = p.type === 'slow' ? '#38bdf8' : '#facc15'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    // HUD
    ctx.fillStyle = '#eaf4ff'; ctx.font = '16px Inter,sans-serif';
    ctx.fillText('Score: ' + Math.floor(STATE.score), 20, 24);
    if (STATE.combo > 1) ctx.fillText('Combo x' + STATE.combo, 20, 48);
    if (STATE.slowmo > 0) ctx.fillText('SLOW-MO ' + STATE.slowmo.toFixed(1), 20, 72);
    if (STATE.shield > 0) ctx.fillText('SHIELD ' + STATE.shield.toFixed(1), 20, 96);
    if (STATE.over) { ctx.fillStyle = '#ff29a8'; ctx.font = 'bold 42px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W / 2, H / 2); ctx.textAlign = 'start'; }
  }

  /* save score to localStorage */
  function saveScore() {
    try {
      const key = 'gf_quantum_scores';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ name: 'Player', score: Math.floor(STATE.score), ts: Date.now() });
      list.sort((a, b) => b.score - a.score);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch (e) { console.error("Could not save score", e); }
  }
}