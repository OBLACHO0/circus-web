// ═══════════════════════════════════════════════════════
//  GAME.JS — физика, фрукты, отрисовка
//  Canvas: Y растёт ВНИЗ (0 = верх экрана)
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

// ── Координаты в базовых 360×640 (Y сверху вниз) ──────
const WALL_LEFT   = 30;
const WALL_RIGHT  = 330;
const FLOOR_Y     = 560;   // пол (низ поля)
const DANGER_Y    = 270;   // линия опасности (верх поля)
const SHOOTER_Y   = 180;   // позиция шутера
const SCORE_TOP   = 10;    // верх панели счёта

// ── Загрузка изображений ───────────────────────────────
const images = {};

function loadImages(callback) {
  const names = FRUITS.map(f => f.name)
    .concat(["logo", "denis", "igori", "lesa_pluh"]);

  let loaded = 0;
  names.forEach(name => {
    const img = new Image();
    img.src = `assets/images/${name}.png`;
    img.onload = img.onerror = () => {
      if (++loaded === names.length) callback();
    };
    images[name] = img;
  });
}

// ══════════════════════════════════════════════════════
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");

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

  // ── Физика ────────────────────────────────────────────
  _initPhysics() {
    const { Engine, World, Bodies, Events } = Matter;

    this.engine = Engine.create();
    this.engine.gravity.y = 2.0;   // вниз — правильно для canvas
    this.world  = this.engine.world;

    const thick = 20;

    // Пол (внизу поля)
    this._floor = Bodies.rectangle(
      (WALL_LEFT + WALL_RIGHT) / 2, FLOOR_Y + thick / 2,
      WALL_RIGHT - WALL_LEFT, thick,
      { isStatic: true, label: "wall" }
    );
    // Левая стена
    this._wallL = Bodies.rectangle(
      WALL_LEFT - thick / 2, (DANGER_Y + FLOOR_Y) / 2,
      thick, FLOOR_Y - DANGER_Y + 200,
      { isStatic: true, label: "wall" }
    );
    // Правая стена
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

  // ── Спавн ─────────────────────────────────────────────
  spawnFruit(x, y, index) {
    if (index >= FRUITS.length) return;
    const { radius } = FRUITS[index];
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: 0.05,
      friction: 0.8,
      frictionAir: 0.01,
      label: `fruit_${index}`,
    });
    body.fruitIndex = index;
    body.merging    = false;
    Matter.World.add(this.world, body);
    const obj = { body, index, radius, name: FRUITS[index].name };
    this.fruits.push(obj);
    return obj;
  }
  

  // ── Бросок ────────────────────────────────────────────
  drop() {
    if (!this.canDrop || this.gameOver || this.paused) return;
    this.canDrop = false;
    const fruit = this.spawnFruit(this.shooterX, SHOOTER_Y + 20, this.nextIndex);
    // Даём фрукту начальную скорость вниз — плавное падение без толчка
    if (fruit) Matter.Body.setVelocity(fruit.body, { x: 0, y: 8 });
    this.nextIndex      = this.afterNextIndex;
    this.afterNextIndex = Math.floor(Math.random() * 5);
    setTimeout(() => { this.canDrop = true; }, 800);
  }

  // ── Слияние ───────────────────────────────────────────
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

  // ── Опасность (фрукты ВЫШЕ линии опасности = меньший Y) ──
  _checkDanger(dt) {
    const danger = this.fruits.some(f => f.body.position.y < DANGER_Y);
    if (danger) {
      this.dangerTimer += dt;
      if (this.dangerTimer >= 4) this.gameOver = true;
    } else {
      this.dangerTimer = 0;
    }
  }

  // ── Рестарт ───────────────────────────────────────────
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

  stop() {
  this._stopped = true;
}

  // ── Главный цикл ──────────────────────────────────────
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

  // ── Отрисовка ─────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const sx  = this.scaleX;
    const sy  = this.scaleY;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.scale(sx, sy);

    // Фон
    ctx.fillStyle = "#d9d9e0";
    ctx.fillRect(0, 0, 360, 640);

    // Игровое поле
    ctx.fillStyle = "#c7c7cf";
    ctx.fillRect(WALL_LEFT, DANGER_Y,
      WALL_RIGHT - WALL_LEFT, FLOOR_Y - DANGER_Y);

    // Левая и правая стены + пол
    ctx.strokeStyle = "#666672";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(WALL_LEFT, DANGER_Y);
    ctx.lineTo(WALL_LEFT, FLOOR_Y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(WALL_RIGHT, DANGER_Y);
    ctx.lineTo(WALL_RIGHT, FLOOR_Y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(WALL_LEFT, FLOOR_Y);
    ctx.lineTo(WALL_RIGHT, FLOOR_Y);
    ctx.stroke();

    // Пунктир опасности (вверху поля)
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(WALL_LEFT,  DANGER_Y);
    ctx.lineTo(WALL_RIGHT, DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Шутер
    const sw = 80, sh = 90;
    const sxPos = this.shooterX;
    if (images["lesa_pluh"] && images["lesa_pluh"].naturalWidth > 0) {
      ctx.drawImage(images["lesa_pluh"],
        sxPos - sw / 2, SHOOTER_Y - sh / 2, sw, sh);
    } else {
      this._roundRect(ctx, sxPos - sw/2, SHOOTER_Y - sh/2, sw, sh, 8, "#4d66cc");
    }

    // Фрукт под шутером
    const dropR = FRUITS[this.nextIndex].radius;
    const dropY = SHOOTER_Y + sh / 2 + dropR + 2;
    this._drawFruitAt(ctx, sxPos, dropY, this.nextIndex);

    // Прицел
    ctx.strokeStyle = "rgba(255,50,50,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sxPos, dropY + dropR);
    ctx.lineTo(sxPos, DANGER_Y);
    ctx.stroke();

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
        ctx.drawImage(images[f.name], -s, -s, s * 2, s * 2);
      } else {
        ctx.fillStyle = FRUIT_COLORS[f.index] || "#888";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Таймер опасности
    if (this.dangerTimer > 0 && !this.gameOver) {
      const rem = (4 - this.dangerTimer).toFixed(1);
      this._text(ctx, `⚠ ${rem}`, 180, DANGER_Y - 14, 18, "#ff3333");
    }

    // ── UI панели (счёт и превью) ── вверху экрана ──────
    this._roundRect(ctx, 15, 10, 130, 50, 10, "#7285a6");
    this._roundRect(ctx, 22, 16, 116, 34, 8,  "#d0e0eb");
    this._text(ctx, "Счет:", 80, 26, 14, "#555570");
    this._text(ctx, String(this.score).padStart(4,"0"), 80, 42, 18, "#333348");

    this._roundRect(ctx, 215, 10, 130, 50, 10, "#666672");
    this._text(ctx, "Олух:", 240, 26, 13, "#ffffff");
    const nr = FRUITS[this.afterNextIndex].radius * 0.6;
    this._drawFruitAt(ctx, 295, 35, this.afterNextIndex, nr);

    // Game Over
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, 360, 640);
      this._roundRect(ctx, 60, 220, 240, 180, 15, "#e8e8f2");
      this._text(ctx, "ТЫ ПРОИГРАЛ!", 180, 265, 26, "#cc1a1a");
      this._text(ctx, `Счёт: ${this.score}`, 180, 310, 20, "#333348");
      this._text(ctx, "Нажми чтобы начать заново", 180, 360, 13, "#666680");
    }

    ctx.restore();
  }

  // ── Вспомогалки ───────────────────────────────────────
  _drawFruitAt(ctx, x, y, index, overrideR) {
    const r    = overrideR || FRUITS[index].radius;
    const name = FRUITS[index].name;
    if (images[name] && images[name].naturalWidth > 0) {
      ctx.drawImage(images[name], x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = FRUIT_COLORS[index];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _roundRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r,  y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
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