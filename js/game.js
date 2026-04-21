// ═══════════════════════════════════════════════════════
//  GAME.JS
// ═══════════════════════════════════════════════════════

const FRUITS = [
  { name: "cherry",      radius: 15 },
  { name: "strawberry",  radius: 20 },
  { name: "grapes",      radius: 25 },
  { name: "lemon",       radius: 30 },
  { name: "orange",      radius: 35 },
  { name: "apple",       radius: 40 },
  { name: "pear",        radius: 45 },
  { name: "peach",       radius: 50 },
  { name: "pineapple",   radius: 55 },
  { name: "melon",       radius: 60 },
  { name: "watermelon",  radius: 70 },
];

const FRUIT_COLORS = [
  "#ff0000","#ff4d4d","#800080","#ffff00","#ff8000",
  "#cc0000","#80cc00","#ffb380","#ffcc00","#80ff4d","#00b300",
];

const WALL_LEFT  = 30;
const WALL_RIGHT = 330;
const FLOOR_Y    = 560;
const DANGER_Y   = 270;
const SHOOTER_Y  = 180;

// Координаты кнопок Game Over (в базовых 360x640)
const BTN_RESTART = { x: 70, y: 350, w: 220, h: 46 };
const BTN_DONATE  = { x: 70, y: 408, w: 220, h: 46 };

function getBestScore() {
  try { return parseInt(localStorage.getItem("bestScore") || "0"); } catch(e) { return 0; }
}
function saveBestScore(score) {
  try { if (score > getBestScore()) localStorage.setItem("bestScore", String(score)); } catch(e) {}
}

// ── Загрузка изображений ──────────────────────────────
const images = {};
function loadImages(callback) {
  const names = FRUITS.map(f => f.name).concat(["logo","denis","igori","lesa_pluh"]);
  let loaded = 0;
  names.forEach(name => {
    const img = new Image();
    img.src = `assets/images/${name}.png`;
    img.onload = img.onerror = () => { if (++loaded === names.length) callback(); };
    images[name] = img;
  });
}

// ══════════════════════════════════════════════════════
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
    this._stopped = false;

    // Высокое качество через device pixel ratio
    this._dpr = window.devicePixelRatio || 1;

    this.scaleX = canvas.width  / 360;
    this.scaleY = canvas.height / 640;

    this.fruits       = [];
    this.score        = 0;
    this.gameOver     = false;
    this.paused       = false;
    this.canDrop      = true;
    this.dangerTimer  = 0;
    this.shooterX     = 180;

    this.nextIndex      = Math.floor(Math.random() * 5);
    this.afterNextIndex = Math.floor(Math.random() * 5);

    this.musicVolume = 1.0;
    this.sfxVolume   = 1.0;

    this._initPhysics();
    this._lastTime = null;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ── Физика ───────────────────────────────────────────
  _initPhysics() {
    const { Engine, World, Bodies, Events } = Matter;
    this.engine = Engine.create();
    this.engine.gravity.y = 1.5;
    this.world = this.engine.world;

    const thick = 20;
    this._floor = Bodies.rectangle(
      (WALL_LEFT + WALL_RIGHT) / 2, FLOOR_Y + thick / 2,
      WALL_RIGHT - WALL_LEFT, thick,
      { isStatic: true, label: "wall" }
    );
    this._wallL = Bodies.rectangle(
      WALL_LEFT - thick / 2, (DANGER_Y + FLOOR_Y) / 2,
      thick, FLOOR_Y - DANGER_Y + 200,
      { isStatic: true, label: "wall" }
    );
    this._wallR = Bodies.rectangle(
      WALL_RIGHT + thick / 2, (DANGER_Y + FLOOR_Y) / 2,
      thick, FLOOR_Y - DANGER_Y + 200,
      { isStatic: true, label: "wall" }
    );
    World.add(this.world, [this._floor, this._wallL, this._wallR]);

    Events.on(this.engine, "collisionStart", (e) => {
      if (this.gameOver || this.paused) return;
      e.pairs.forEach(pair => this._handleCollision(pair));
    });
  }

  // ── Спавн ────────────────────────────────────────────
  spawnFruit(x, y, index) {
    if (index >= FRUITS.length) return null;
    const { radius } = FRUITS[index];
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: 0.2,
      friction: 0.5,
      frictionAir: 0.008,
      frictionStatic: 0.5,
      label: `fruit_${index}`,
    });
    body.fruitIndex = index;
    body.merging    = false;
    Matter.World.add(this.world, body);
    const obj = { body, index, radius, name: FRUITS[index].name };
    this.fruits.push(obj);
    return obj;
  }

  // ── Бросок ───────────────────────────────────────────
  drop() {
    if (!this.canDrop || this.gameOver || this.paused) return;
    this.canDrop = false;
    const fruit = this.spawnFruit(this.shooterX, SHOOTER_Y + 20, this.nextIndex);
    if (fruit) Matter.Body.setVelocity(fruit.body, { x: 0, y: 8 });
    this.nextIndex      = this.afterNextIndex;
    this.afterNextIndex = Math.floor(Math.random() * 5);
    setTimeout(() => { this.canDrop = true; }, 800);
  }

  // ── Слияние ──────────────────────────────────────────
  _handleCollision(pair) {
    const { bodyA, bodyB } = pair;
    const fa = this.fruits.find(f => f.body === bodyA);
    const fb = this.fruits.find(f => f.body === bodyB);
    if (!fa || !fb) return;
    if (fa.index !== fb.index) return;
    if (fa.body.merging || fb.body.merging) return;
    fa.body.merging = true;
    fb.body.merging = true;
    const mx = (bodyA.position.x + bodyB.position.x) / 2;
    const my = (bodyA.position.y + bodyB.position.y) / 2;
    const newIndex = fa.index + 1;
    setTimeout(() => {
      Matter.World.remove(this.world, bodyA);
      Matter.World.remove(this.world, bodyB);
      this.fruits = this.fruits.filter(f => f !== fa && f !== fb);
      this.score += newIndex * 10;
      if (newIndex < FRUITS.length) this.spawnFruit(mx, my, newIndex);
    }, 50);
  }

  // ── Опасность ────────────────────────────────────────
  _checkDanger(dt) {
    const danger = this.fruits.some(f => f.body.position.y < DANGER_Y);
    if (danger) {
      this.dangerTimer += dt;
      if (this.dangerTimer >= 4) {
        this.gameOver = true;
        saveBestScore(this.score);
      }
    } else {
      this.dangerTimer = 0;
    }
  }

  // ── Рестарт ──────────────────────────────────────────
  restart() {
    this.fruits.forEach(f => Matter.World.remove(this.world, f.body));
    this.fruits       = [];
    this.score        = 0;
    this.gameOver     = false;
    this.dangerTimer  = 0;
    this.canDrop      = true;
    this.nextIndex      = Math.floor(Math.random() * 5);
    this.afterNextIndex = Math.floor(Math.random() * 5);
  }

  stop() { this._stopped = true; }

  // ── Проверка попадания в кнопку Game Over ─────────────
  hitTestGameOver(clientX, clientY) {
    const bx = clientX / this.scaleX;
    const by = clientY / this.scaleY;
    if (bx >= BTN_RESTART.x && bx <= BTN_RESTART.x + BTN_RESTART.w &&
        by >= BTN_RESTART.y && by <= BTN_RESTART.y + BTN_RESTART.h) {
      return "restart";
    }
    if (bx >= BTN_DONATE.x && bx <= BTN_DONATE.x + BTN_DONATE.w &&
        by >= BTN_DONATE.y && by <= BTN_DONATE.y + BTN_DONATE.h) {
      return "donate";
    }
    return null;
  }

  // ── Главный цикл ─────────────────────────────────────
  _loop(ts) {
    if (this._stopped) return;
    if (this._lastTime === null) this._lastTime = ts;
    const dt = Math.min((ts - this._lastTime) / 1000, 0.05);
    this._lastTime = ts;
    if (!this.paused && !this.gameOver) {
      Matter.Engine.update(this.engine, dt * 1000);
      this._checkDanger(dt);
    }
    this._draw();
    requestAnimationFrame(this._loop);
  }

  // ── Отрисовка ────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const sx  = this.scaleX;
    const sy  = this.scaleY;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.scale(sx, sy);

    // Фон
    ctx.fillStyle = "#d9d9e0";
    ctx.fillRect(0, 0, 360, 640);

    // Игровое поле
    const fieldGrad = ctx.createLinearGradient(WALL_LEFT, DANGER_Y, WALL_RIGHT, FLOOR_Y);
    fieldGrad.addColorStop(0, "#ccccd6");
    fieldGrad.addColorStop(1, "#c2c2cc");
    ctx.fillStyle = fieldGrad;
    ctx.fillRect(WALL_LEFT, DANGER_Y, WALL_RIGHT - WALL_LEFT, FLOOR_Y - DANGER_Y);

    // Стены
    ctx.strokeStyle = "#555560";
    ctx.lineWidth   = 4;
    ctx.lineCap     = "round";
    ctx.beginPath(); ctx.moveTo(WALL_LEFT,  DANGER_Y); ctx.lineTo(WALL_LEFT,  FLOOR_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(WALL_RIGHT, DANGER_Y); ctx.lineTo(WALL_RIGHT, FLOOR_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(WALL_LEFT,  FLOOR_Y);  ctx.lineTo(WALL_RIGHT, FLOOR_Y); ctx.stroke();

    // Пунктир опасности
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth   = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.moveTo(WALL_LEFT, DANGER_Y); ctx.lineTo(WALL_RIGHT, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);

    // Шутер
    const sw = 80, sh = 90;
    const sxPos = this.shooterX;
    if (images["lesa_pluh"] && images["lesa_pluh"].naturalWidth > 0) {
      ctx.drawImage(images["lesa_pluh"], sxPos - sw/2, SHOOTER_Y - sh/2, sw, sh);
    } else {
      this._roundRect(ctx, sxPos - sw/2, SHOOTER_Y - sh/2, sw, sh, 8, "#4d66cc");
    }

    // Фрукт под шутером
    const dropR = FRUITS[this.nextIndex].radius;
    const dropY = SHOOTER_Y + sh/2 + dropR + 2;
    this._drawFruitAt(ctx, sxPos, dropY, this.nextIndex);

    // Прицел
    ctx.strokeStyle = "rgba(255,50,50,0.35)";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(sxPos, dropY + dropR); ctx.lineTo(sxPos, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);

    // Фрукты
    this.fruits.forEach(f => {
      const { x, y } = f.body.position;
      const r = f.radius;
      const scale = 1.4 - f.index * 0.02;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.body.angle);
      if (images[f.name] && images[f.name].naturalWidth > 0) {
        const s = r * scale;
        ctx.drawImage(images[f.name], -s, -s, s*2, s*2);
      } else {
        ctx.fillStyle = FRUIT_COLORS[f.index] || "#888";
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });

    // Таймер опасности
    if (this.dangerTimer > 0 && !this.gameOver) {
      const rem = (4 - this.dangerTimer).toFixed(1);
      this._roundRect(ctx, 140, DANGER_Y - 30, 80, 22, 8, "rgba(200,0,0,0.15)");
      this._text(ctx, `⚠ ${rem}`, 180, DANGER_Y - 19, 16, "#ff2222");
    }

    // ── UI вверху ─────────────────────────────────────
    // Счёт
    this._drawPanel(ctx, 10, 8, 105, 58, "#5a6e8a");
    this._roundRect(ctx, 16, 14, 93, 28, 6, "rgba(255,255,255,0.25)");
    this._text(ctx, String(this.score).padStart(4,"0"), 62, 28, 20, "#ffffff");
    this._text(ctx, "СЧЁТ", 62, 52, 11, "rgba(255,255,255,0.7)");

    // Рекорд
    this._drawPanel(ctx, 125, 8, 110, 58, "#6a5a8a");
    this._roundRect(ctx, 131, 14, 98, 28, 6, "rgba(255,255,255,0.2)");
    this._text(ctx, String(getBestScore()).padStart(4,"0"), 180, 28, 20, "#ffffff");
    this._text(ctx, "РЕКОРД", 180, 52, 11, "rgba(255,255,255,0.7)");

    // Олух
    this._drawPanel(ctx, 245, 8, 108, 58, "#555565");
    this._text(ctx, "ОЛУХ", 299, 52, 11, "rgba(255,255,255,0.7)");
    const nr = FRUITS[this.afterNextIndex].radius * 0.65;
    this._drawFruitAt(ctx, 299, 30, this.afterNextIndex, nr);

    // ── Game Over ─────────────────────────────────────
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, 360, 640);

      this._drawPanelShadow(ctx, 50, 200, 260, 270, 20, "#f0f0f8");
      this._text(ctx, "ВЫ ПРОИГРАЛИ!", 180, 248, 26, "#cc1a1a");

      this._roundRect(ctx, 80, 265, 200, 36, 10, "rgba(0,0,0,0.07)");
      this._text(ctx, `Счёт: ${this.score}`, 180, 283, 18, "#333348");

      this._roundRect(ctx, 80, 308, 200, 30, 10, "rgba(0,0,0,0.05)");
      this._text(ctx, `Рекорд: ${getBestScore()}`, 180, 323, 15, "#555570");

      // Кнопка «Начать сначала»
      this._drawButton(ctx,
        BTN_RESTART.x, BTN_RESTART.y,
        BTN_RESTART.w, BTN_RESTART.h,
        12, "#5a6e8a", "Начать сначала", 16, "#ffffff");

      // Кнопка «Продолжить за $2»
      this._drawButton(ctx,
        BTN_DONATE.x, BTN_DONATE.y,
        BTN_DONATE.w, BTN_DONATE.h,
        12, "#c8a020", "Продолжить за $2 💰", 15, "#ffffff");
    }

    ctx.restore();
  }

  // ── Вспомогалки ──────────────────────────────────────
  _drawFruitAt(ctx, x, y, index, overrideR) {
    const r    = overrideR !== undefined ? overrideR : FRUITS[index].radius;
    const name = FRUITS[index].name;
    if (images[name] && images[name].naturalWidth > 0) {
      ctx.drawImage(images[name], x-r, y-r, r*2, r*2);
    } else {
      ctx.fillStyle = FRUIT_COLORS[index];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawPanel(ctx, x, y, w, h, color) {
    ctx.shadowColor   = "rgba(0,0,0,0.22)";
    ctx.shadowBlur    = 10;
    ctx.shadowOffsetY = 3;
    this._roundRect(ctx, x, y, w, h, 12, color);
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;
  }

  _drawPanelShadow(ctx, x, y, w, h, r, color) {
    ctx.shadowColor   = "rgba(0,0,0,0.35)";
    ctx.shadowBlur    = 24;
    ctx.shadowOffsetY = 8;
    this._roundRect(ctx, x, y, w, h, r, color);
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;
  }

  _drawButton(ctx, x, y, w, h, r, bg, text, fontSize, textColor) {
    const grad = ctx.createLinearGradient(x, y, x, y+h);
    grad.addColorStop(0, this._lighten(bg, 20));
    grad.addColorStop(1, bg);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
    this._text(ctx, text, x+w/2, y+h/2, fontSize, textColor);
  }

  _lighten(hex, amt) {
    const num = parseInt(hex.replace("#",""), 16);
    const r = Math.min(255, (num >> 16) + amt);
    const g = Math.min(255, ((num >> 8) & 0xff) + amt);
    const b = Math.min(255, (num & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  _roundRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
  }

  _text(ctx, text, x, y, size, color) {
    ctx.fillStyle    = color;
    ctx.font         = `bold ${size}px Arial`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }
}