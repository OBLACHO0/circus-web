// ═══════════════════════════════════════════════════════
//  MAIN.JS
// ═══════════════════════════════════════════════════════

window.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("game-canvas");

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

  loadImages(() => { showSplash(); });

  // ── Сплэш ─────────────────────────────────────────────
  function showSplash() {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("splash-screen").classList.add("active");
    setTimeout(() => {
      const logo = document.getElementById("splash-logo");
      logo.style.transition = "opacity 0.4s";
      logo.style.opacity = "0";
      setTimeout(showMenu, 400);
    }, 1400);
  }

  // ── Меню ──────────────────────────────────────────────
  function showMenu() {
    if (window.currentGame) {
      window.currentGame._stopped = true;
      window.currentGame = null;
    }

    document.getElementById("menu-toggle-btn").style.display = "none";
    document.getElementById("pause-panel").classList.add("hidden");
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("menu-screen").classList.add("active");

    const title = document.getElementById("menu-title");
    const denis = document.getElementById("char-denis");
    const igori = document.getElementById("char-igori");
    const btn   = document.getElementById("play-btn");

    [title, denis, igori, btn].forEach(el => {
      el.classList.remove("show");
      el.style.opacity = "";
    });
    denis.style.transform = "";
    igori.style.transform = "";

    setTimeout(() => title.classList.add("show"), 100);
    setTimeout(() => denis.classList.add("show"), 300);
    setTimeout(() => igori.classList.add("show"), 450);
    setTimeout(() => btn.classList.add("show"),   600);

    let bobT = 0;
    const bobInterval = setInterval(() => {
      if (!document.getElementById("menu-screen").classList.contains("active")) {
        clearInterval(bobInterval); return;
      }
      bobT += 0.05;
      denis.style.transform = `translateY(${Math.sin(bobT) * 8}px)`;
      igori.style.transform = `translateY(${Math.sin(bobT + 1) * 8}px)`;
    }, 30);

    btn.onclick = () => {
      clearInterval(bobInterval);
      [title, denis, igori, btn].forEach(el => {
        el.style.transition = "opacity 0.3s";
        el.style.opacity = "0";
      });
      setTimeout(showGame, 350);
    };
  }

  // ── Игра ──────────────────────────────────────────────
  function showGame() {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("game-screen").classList.add("active");

    resizeCanvas();
    const game = new Game(canvas);
    window.currentGame = game;

    // Кнопка ☰
    const toggleBtn = document.getElementById("menu-toggle-btn");
    const panel     = document.getElementById("pause-panel");

    toggleBtn.style.display        = "flex";
    toggleBtn.style.alignItems     = "center";
    toggleBtn.style.justifyContent = "center";
    panel.classList.add("hidden");
    canvas.style.pointerEvents = "all";

    const newToggle = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);
    newToggle.addEventListener("click", () => {
      const isOpen = !panel.classList.contains("hidden");
      if (isOpen) {
        panel.classList.add("hidden");
        canvas.style.pointerEvents = "all";
        game.paused = false;
      } else {
        panel.classList.remove("hidden");
        canvas.style.pointerEvents = "none";
        game.paused = true;
      }
    });

    // Вернуть двух долбоебов
    const btnBack = document.getElementById("btn-back-menu");
    const newBtnBack = btnBack.cloneNode(true);
    btnBack.parentNode.replaceChild(newBtnBack, btnBack);
    newBtnBack.addEventListener("click", () => { showMenu(); });

    // Убить Мат. Анализом
    const btnRestart = document.getElementById("btn-restart");
    const newBtnRestart = btnRestart.cloneNode(true);
    btnRestart.parentNode.replaceChild(newBtnRestart, btnRestart);
    newBtnRestart.addEventListener("click", () => {
      panel.classList.add("hidden");
      canvas.style.pointerEvents = "all";
      game.paused = false;
      game.restart();
    });

    document.getElementById("slider-music").oninput = (e) => { game.musicVolume = e.target.value / 100; };
    document.getElementById("slider-sfx").oninput   = (e) => { game.sfxVolume   = e.target.value / 100; };

    // ── Обработка нажатий ────────────────────────────────
    function handleTap(clientX, clientY) {
      if (game.paused) return;

      if (game.gameOver) {
        const hit = game.hitTestGameOver(clientX, clientY);
        if (hit === "restart") { game.restart(); return; }
        if (hit === "donate")  {
          if (confirm("Продолжить игру за $2?\n(Функция оплаты в разработке)")) {
            // Убираем game over и продолжаем
            game.gameOver = false;
            game.dangerTimer = 0;
          }
          return;
        }
        return;
      }

      const bx = clientX / game.scaleX;
      game.shooterX = Math.max(50, Math.min(310, bx));
      game.drop();
    }

    function handleMove(clientX) {
      if (game.paused || game.gameOver) return;
      game.shooterX = Math.max(50, Math.min(310, clientX / game.scaleX));
    }

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleTap(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    }, { passive: false });

    canvas.addEventListener("mousedown", (e) => {
      handleTap(e.clientX, e.clientY);
    });

    canvas.addEventListener("mousemove", (e) => {
      if (e.buttons !== 1) return;
      handleMove(e.clientX);
    });
  }

});