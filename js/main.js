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

  loadImages(() => {
    showSplash();
  });

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
    // Останавливаем игру если была
    if (window.currentGame) {
      window.currentGame._stopped = true;
      window.currentGame = null;
    }

    // Убираем игровой UI
    document.getElementById("menu-toggle-btn").style.display = "none";
    document.getElementById("pause-panel").classList.add("hidden");

    // Показываем меню
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("menu-screen").classList.add("active");

    const title = document.getElementById("menu-title");
    const denis = document.getElementById("char-denis");
    const igori = document.getElementById("char-igori");
    const btn   = document.getElementById("play-btn");

    // Сброс стилей
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

    // Боббинг
    let bobT = 0;
    const bobInterval = setInterval(() => {
      if (!document.getElementById("menu-screen").classList.contains("active")) {
        clearInterval(bobInterval);
        return;
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

    // ── Кнопка ☰ ──
    const toggleBtn = document.getElementById("menu-toggle-btn");
    const panel     = document.getElementById("pause-panel");

    toggleBtn.style.display         = "flex";
    toggleBtn.style.alignItems      = "center";
    toggleBtn.style.justifyContent  = "center";
    panel.classList.add("hidden");
    canvas.style.pointerEvents = "all";

    // Новый обработчик (убираем старый клонированием)
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

    // Кнопка «Вернуть двух долбоебов»
    const btnBack = document.getElementById("btn-back-menu");
    const newBtnBack = btnBack.cloneNode(true);
    btnBack.parentNode.replaceChild(newBtnBack, btnBack);
    newBtnBack.addEventListener("click", () => {
      showMenu();
    });

    // Кнопка «Убить Мат. Анализом»
    const btnRestart = document.getElementById("btn-restart");
    const newBtnRestart = btnRestart.cloneNode(true);
    btnRestart.parentNode.replaceChild(newBtnRestart, btnRestart);
    newBtnRestart.addEventListener("click", () => {
      panel.classList.add("hidden");
      canvas.style.pointerEvents = "all";
      game.paused = false;
      game.restart();
    });

    // Ползунки
    document.getElementById("slider-music").oninput = (e) => {
      game.musicVolume = e.target.value / 100;
    };
    document.getElementById("slider-sfx").oninput = (e) => {
      game.sfxVolume = e.target.value / 100;
    };

    // ── Касания ──
    function getBaseX(clientX) {
      return clientX / game.scaleX;
    }

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (game.paused) return;
      const bx = getBaseX(e.touches[0].clientX);
      if (game.gameOver) {
        const by = e.touches[0].clientY / game.scaleY;
        if (by >= 342 && by <= 388) { game.restart(); return; }
        if (by >= 398 && by <= 444) { alert("💰 Функция оплаты пока не подключена!"); return; }
        return;
      }
      game.shooterX = Math.max(50, Math.min(310, bx));
      game.drop();
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (game.paused || game.gameOver) return;
      const bx = getBaseX(e.touches[0].clientX);
      game.shooterX = Math.max(50, Math.min(310, bx));
    }, { passive: false });

    canvas.addEventListener("mousedown", (e) => {
      if (game.paused) return;
      const bx = getBaseX(e.clientX);
      if (game.gameOver) {
        const by = e.clientY / game.scaleY;
        if (by >= 342 && by <= 388) { game.restart(); return; }
        if (by >= 398 && by <= 444) { alert("💰 Функция оплаты пока не подключена!"); return; }
        return;
      }
      game.shooterX = Math.max(50, Math.min(310, bx));
      game.drop();
    });

    canvas.addEventListener("mousemove", (e) => {
      if (game.paused || game.gameOver || e.buttons !== 1) return;
      game.shooterX = Math.max(50, Math.min(310, getBaseX(e.clientX)));
    });
  }

});