// ═══════════════════════════════════════════════════════
//  MAIN.JS — точка входа, canvas, касания
// ═══════════════════════════════════════════════════════

window.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("game-canvas");

  // Размер canvas = размер экрана
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    if (window.currentGame) {
      window.currentGame.scaleX = canvas.width  / 360;
      window.currentGame.scaleY = canvas.height / 640;
    }
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Загружаем картинки один раз
  loadImages(() => {
    startSplash();
  });

  // ── Сплэш ─────────────────────────────────────────────
  function startSplash() {
    initSplash(() => startMenu());
  }

  // ── Меню ──────────────────────────────────────────────
  function startMenu() {
    // Убираем старую игру если была
    if (window.currentGame) {
      window.currentGame = null;
    }
    initMenu(() => startGame());
  }

  // ── Игра ──────────────────────────────────────────────
  function startGame() {
    resizeCanvas();
    const game = new Game(canvas);
    window.currentGame = game;
    initGameUI(game, () => startMenu());
    bindTouchEvents(game);
  }

  // ── Касания / клики ───────────────────────────────────
  function bindTouchEvents(game) {

    function getBaseX(clientX) {
      return clientX / game.scaleX;
    }

    // Тач
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (game.paused) return;
      const touch = e.touches[0];
      const bx = getBaseX(touch.clientX);

      if (game.gameOver) {
        game.restart();
        return;
      }
      game.shooterX = Math.max(30 + 20, Math.min(330 - 20, bx));
      game.drop();
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (game.paused || game.gameOver) return;
      const touch = e.touches[0];
      const bx = getBaseX(touch.clientX);
      game.shooterX = Math.max(30 + 20, Math.min(330 - 20, bx));
    }, { passive: false });

    // Мышь (для ПК / отладки)
    canvas.addEventListener("mousedown", (e) => {
      if (game.paused) return;
      const bx = getBaseX(e.clientX);

      if (game.gameOver) {
        game.restart();
        return;
      }
      game.shooterX = Math.max(30 + 20, Math.min(330 - 20, bx));
      game.drop();
    });

    canvas.addEventListener("mousemove", (e) => {
      if (game.paused || game.gameOver) return;
      if (e.buttons !== 1) return;
      const bx = getBaseX(e.clientX);
      game.shooterX = Math.max(30 + 20, Math.min(330 - 20, bx));
    });
  }

});
