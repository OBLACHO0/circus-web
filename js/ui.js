// ═══════════════════════════════════════════════════════
//  UI.JS — экраны, меню, кнопки
// ═══════════════════════════════════════════════════════

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ── Сплэш ───────────────────────────────────────────────
function initSplash(onDone) {
  showScreen("splash-screen");
  // Анимация через CSS, после неё переходим в меню
  setTimeout(() => {
    const logo = document.getElementById("splash-logo");
    logo.style.transition = "opacity 0.4s";
    logo.style.opacity    = "0";
    setTimeout(onDone, 400);
  }, 1400);
}

// ── Меню ────────────────────────────────────────────────
function initMenu(onPlay) {
  showScreen("menu-screen");

  const title = document.getElementById("menu-title");
  const denis = document.getElementById("char-denis");
  const igori = document.getElementById("char-igori");
  const btn   = document.getElementById("play-btn");

  // Сброс
  [title, denis, igori, btn].forEach(el => el.classList.remove("show"));

  setTimeout(() => title.classList.add("show"), 100);
  setTimeout(() => denis.classList.add("show"), 300);
  setTimeout(() => igori.classList.add("show"), 450);
  setTimeout(() => btn.classList.add("show"),   600);

  // Боббинг персонажей
  let bobT = 0;
  const bobInterval = setInterval(() => {
    bobT += 0.05;
    denis.style.transform = `translateX(0) translateY(${Math.sin(bobT) * 8}px)`;
    igori.style.transform = `translateX(0) translateY(${Math.sin(bobT + 1) * 8}px)`;
  }, 30);

  btn.onclick = () => {
    clearInterval(bobInterval);
    [title, denis, igori, btn].forEach(el => {
      el.style.transition = "opacity 0.3s";
      el.style.opacity    = "0";
    });
    setTimeout(onPlay, 350);
  };
}

// ── Игровой UI ──────────────────────────────────────────
function initGameUI(game, onBackToMenu) {
  showScreen("game-screen");

  const toggleBtn  = document.getElementById("menu-toggle-btn");
  const panel      = document.getElementById("pause-panel");
  const btnBack    = document.getElementById("btn-back-menu");
  const btnRestart = document.getElementById("btn-restart");
  const sliderM    = document.getElementById("slider-music");
  const sliderS    = document.getElementById("slider-sfx");

  toggleBtn.style.display = "flex";
  toggleBtn.style.alignItems = "center";
  toggleBtn.style.justifyContent = "center";

  let panelOpen = false;

  toggleBtn.onclick = () => {
    panelOpen = !panelOpen;
    game.paused = panelOpen;
    panel.classList.toggle("hidden", !panelOpen);
  };

  btnBack.onclick = () => {
    panel.classList.add("hidden");
    toggleBtn.style.display = "none";
    panelOpen  = false;
    game.paused = false;
    onBackToMenu();
  };

  btnRestart.onclick = () => {
    panelOpen  = false;
    game.paused = false;
    panel.classList.add("hidden");
    game.restart();
  };

  sliderM.oninput = () => { game.musicVolume = sliderM.value / 100; };
  sliderS.oninput = () => { game.sfxVolume   = sliderS.value / 100; };
}
