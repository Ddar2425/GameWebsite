/* Original Sproutplay mini-games. No third-party game code or assets. */
"use strict";
const params = new URLSearchParams(location.search);
const modes = [
  "space",
  "racer",
  "snake",
  "breakout",
  "runner",
  "memory",
  "clicker",
  "duel",
];
const mode = modes.includes(params.get("mode")) ? params.get("mode") : "space";
const level = Math.max(1, Math.min(8, Number(params.get("level")) || 1));
const title = params.get("title") || "Sprout Arcade";
document.title = title;
document.body.dataset.mode = mode;
document.getElementById("title").textContent = title;
const canvas = document.getElementById("canvas"),
  ctx = canvas.getContext("2d");
const board = document.getElementById("board"),
  overlay = document.getElementById("overlay");
const scoreText = document.getElementById("score"),
  hint = document.getElementById("hint");
const keys = new Set();
let score = 0,
  paused = false,
  over = false,
  state,
  last = performance.now(),
  lastScore = -1;
const random = (min, max) => min + Math.random() * (max - min);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const intersects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function updateScore(label) {
  const points = Math.floor(score);
  if (points !== lastScore || label) {
    scoreText.textContent = label || `Score: ${points}`;
    lastScore = points;
  }
}
function finish(message = "Game over") {
  over = true;
  let best = 0;
  try {
    best = Number(localStorage.getItem(`sprout:best:${mode}:${level}`)) || 0;
    if (!Number.isFinite(best) || best < 0) best = 0;
    if (score > best) {
      best = Math.floor(score);
      localStorage.setItem(`sprout:best:${mode}:${level}`, String(best));
    }
  } catch {}
  document.getElementById("message").textContent = message;
  document.getElementById("summary").textContent =
    `Score: ${Math.floor(score)} · Best: ${best}`;
  overlay.hidden = false;
  document.getElementById("again").focus();
}
function reset(focus = true) {
  score = 0;
  lastScore = -1;
  paused = false;
  over = false;
  keys.clear();
  overlay.hidden = true;
  document.getElementById("again").textContent = "Play again";
  board.innerHTML = "";
  board.style.display = "none";
  canvas.style.display = "block";
  document.getElementById("pause").textContent = "Pause";
  document.getElementById("pause").setAttribute("aria-label", "Pause game");
  state = { time: 0 };
  if (mode === "space") {
    Object.assign(state, {
      ship: { x: 480, y: 420, w: 34, h: 38 },
      bullets: [],
      rocks: [],
      spawn: 0,
      fire: 0,
    });
    hint.textContent =
      "Arrow keys / WASD to move · Space to fire · Drag to fly";
  }
  if (mode === "racer") {
    Object.assign(state, { x: 480, cars: [], spawn: 0 });
    hint.textContent =
      "Left / Right or A / D to steer · Drag to steer · Avoid traffic";
  }
  if (mode === "snake") {
    Object.assign(state, {
      snake: [
        { x: 10, y: 8 },
        { x: 9, y: 8 },
        { x: 8, y: 8 },
      ],
      dir: { x: 1, y: 0 },
      next: { x: 1, y: 0 },
      food: { x: 17, y: 8 },
      step: 0,
      turnLocked: false,
    });
    hint.textContent =
      "Arrow keys / WASD or swipe to turn · Eat fruit · Avoid your tail";
  }
  if (mode === "breakout") {
    Object.assign(state, {
      paddle: 480,
      ball: { x: 480, y: 360, vx: 210 + level * 12, vy: -235 - level * 10 },
      bricks: [],
    });
    for (let y = 0; y < 4 + Math.floor(level / 3); y++)
      for (let x = 0; x < 10; x++)
        state.bricks.push({
          x: 43 + x * 88,
          y: 50 + y * 37,
          w: 80,
          h: 29,
          color: [
            "#f47795",
            "#ffcc65",
            "#76ded1",
            "#b595ef",
            "#86d47d",
            "#72b6f0",
          ][y],
        });
    hint.textContent =
      "Mouse, touch, or Left / Right to move the paddle · Clear the bricks";
  }
  if (mode === "runner") {
    Object.assign(state, { y: 395, vy: 0, obstacles: [], spawn: 0 });
    hint.textContent = "Space, Up, or tap to jump · Dodge the obstacles";
  }
  if (mode === "duel") {
    Object.assign(state, {
      left: 210,
      right: 210,
      a: 0,
      b: 0,
      ball: { x: 480, y: 270, vx: 330, vy: 145 },
    });
    hint.textContent =
      "Two players · W / S and ↑ / ↓ · Or drag either paddle · First to 7";
  }
  if (mode === "memory") setupMemory();
  if (mode === "clicker") setupClicker();
  updateScore();
  if (focus) document.body.focus();
}
function setupMemory() {
  canvas.style.display = "none";
  board.style.display = "flex";
  state = {
    time: 0,
    moves: 0,
    matches: 0,
    open: [],
    locked: false,
    generation: Date.now(),
  };
  hint.textContent = "Turn two cards over · Find every matching pair";
  const symbols = ["✦", "♥", "●", "☀", "♣", "▲", "◆", "☾"];
  const pairs = [...symbols, ...symbols];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  const grid = document.createElement("div");
  grid.className = "memory-grid";
  board.appendChild(grid);
  pairs.forEach((symbol, i) => {
    const card = document.createElement("button");
    card.dataset.index = String(i + 1);
    card.className = "memory-card";
    card.textContent = "?";
    card.setAttribute("aria-label", `Card ${i + 1}, face down`);
    grid.appendChild(card);
    card.onclick = () => {
      if (
        paused ||
        over ||
        state.locked ||
        card.classList.contains("flipped") ||
        card.classList.contains("matched")
      )
        return;
      card.textContent = symbol;
      card.classList.add("flipped");
      card.setAttribute("aria-label", `Card ${i + 1}, ${symbol}`);
      state.open.push({ card, symbol });
      if (state.open.length === 2) {
        state.moves++;
        const [a, b] = state.open;
        updateScore(`Moves: ${state.moves}`);
        if (a.symbol === b.symbol) {
          a.card.classList.add("matched");
          b.card.classList.add("matched");
          a.card.disabled = true;
          b.card.disabled = true;
          state.open = [];
          state.matches++;
          score += 100;
          if (state.matches === 8) {
            score = Math.max(100, 2000 - state.moves * 30);
            finish("All pairs found!");
          }
        } else {
          state.locked = true;
          const generation = state.generation;
          setTimeout(
            () => {
              if (state.generation !== generation) return;
              for (const x of [a, b]) {
                x.card.classList.remove("flipped");
                x.card.textContent = "?";
                x.card.setAttribute(
                  "aria-label",
                  `Card ${x.card.dataset.index}, face down`,
                );
              }
              state.open = [];
              state.locked = false;
            },
            Math.max(450, 1000 - level * 60),
          );
        }
      }
    };
  });
}
function setupClicker() {
  canvas.style.display = "none";
  board.style.display = "flex";
  state = { time: 0, seeds: 0, growers: 0, cost: 10, elapsed: 0 };
  hint.textContent =
    "Tap the sprout to collect seeds · Growers produce seeds automatically";
  const count = document.createElement("div");
  count.className = "garden-count";
  count.id = "garden-count";
  board.appendChild(count);
  const tree = document.createElement("button");
  tree.className = "clicker-tree";
  tree.textContent = "🌱";
  tree.setAttribute("aria-label", "Collect seeds");
  board.appendChild(tree);
  const buy = document.createElement("button");
  buy.className = "grow-button";
  buy.id = "buy-grower";
  board.appendChild(buy);
  tree.onclick = () => {
    if (paused || over) return;
    state.seeds += level;
    score += level;
    refreshGarden();
  };
  buy.onclick = () => {
    if (paused || state.seeds < state.cost) return;
    state.seeds -= state.cost;
    state.growers++;
    state.cost = Math.ceil(state.cost * 1.6);
    refreshGarden();
  };
  refreshGarden();
}
function refreshGarden() {
  document.getElementById("garden-count").textContent =
    `${Math.floor(state.seeds)} seeds · ${state.growers} growers`;
  document.getElementById("buy-grower").textContent =
    `Plant a grower · ${state.cost} seeds`;
  document.getElementById("buy-grower").disabled = state.seeds < state.cost;
  updateScore();
}
function direction(key) {
  const map = {
    ArrowLeft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
  };
  const dir = map[key];
  if (
    mode === "snake" &&
    dir &&
    !state.turnLocked &&
    (dir.x !== -state.dir.x || dir.y !== -state.dir.y)
  ) {
    state.next = dir;
    state.turnLocked = true;
  }
}
function press(key) {
  if (paused || over) return;
  keys.add(key);
  direction(key);
  if (
    mode === "runner" &&
    (key === " " || key === "ArrowUp") &&
    state.y >= 395
  ) {
    state.vy = -660;
  }
}
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof Element &&
    e.target.closest("button,input,select,textarea,[contenteditable]")
  )
    return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      " ",
      "w",
      "a",
      "s",
      "d",
    ].includes(key)
  ) {
    e.preventDefault();
    if (!over && !paused) press(key);
  }
  if (e.key === "Enter" && over) reset();
});
window.addEventListener("keyup", (e) =>
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
window.addEventListener("blur", () => keys.clear());
for (const button of document.querySelectorAll("[data-key]")) {
  button.onpointerdown = (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    press(button.dataset.key);
  };
  button.onpointerup = () => keys.delete(button.dataset.key);
  button.onpointercancel = () => keys.delete(button.dataset.key);
}
let touchStart = null;
function point(e) {
  const r = canvas.getBoundingClientRect();
  const scale = Math.min(r.width / 960, r.height / 540);
  return {
    x: (e.clientX - r.left - (r.width - 960 * scale) / 2) / scale,
    y: (e.clientY - r.top - (r.height - 540 * scale) / 2) / scale,
  };
}
canvas.onpointerdown = (e) => {
  document.body.focus();
  canvas.setPointerCapture(e.pointerId);
  touchStart = point(e);
  if (mode === "runner") press(" ");
  if (mode === "space") keys.add(" ");
  pointer(e);
};
canvas.onpointermove = (e) => {
  if (mode === "breakout" || e.buttons || e.pointerType === "touch") pointer(e);
};
canvas.onpointerup = (e) => {
  keys.delete(" ");
  if (mode === "snake" && touchStart) {
    const p = point(e);
    const dx = p.x - touchStart.x,
      dy = p.y - touchStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 10)
      direction(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "ArrowRight"
            : "ArrowLeft"
          : dy > 0
            ? "ArrowDown"
            : "ArrowUp",
      );
  }
  touchStart = null;
};
canvas.onpointercancel = () => {
  keys.clear();
  touchStart = null;
};
function pointer(e) {
  if (!state || over || paused) return;
  const p = point(e);
  if (mode === "space") {
    state.ship.x = clamp(p.x - 17, 10, 916);
    state.ship.y = clamp(p.y - 20, 60, 490);
  }
  if (mode === "racer") state.x = clamp(p.x, 255, 705);
  if (mode === "breakout") state.paddle = clamp(p.x, 85, 875);
  if (mode === "duel") {
    if (p.x < 480) state.left = clamp(p.y - 55, 0, 430);
    else state.right = clamp(p.y - 55, 0, 430);
  }
}
function pause() {
  if (over) return;
  paused = !paused;
  keys.clear();
  const button = document.getElementById("pause");
  button.textContent = paused ? "Resume" : "Pause";
  button.setAttribute("aria-label", paused ? "Resume game" : "Pause game");
  if (paused) {
    document.getElementById("message").textContent = "Paused";
    document.getElementById("summary").textContent =
      "Take your time. Your game is right here.";
    document.getElementById("again").textContent = "Resume";
    overlay.hidden = false;
  } else {
    overlay.hidden = true;
    document.getElementById("again").textContent = "Play again";
    document.body.focus();
  }
}
document.getElementById("pause").onclick = pause;
document.getElementById("restart").onclick = reset;
document.getElementById("again").onclick = () => (paused ? pause() : reset());
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !paused && !over) pause();
});
function backdrop() {
  ctx.fillStyle = "#142b38";
  ctx.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = i % 3 ? "#5c8392" : "#b7edcd";
    ctx.fillRect(
      (i * 137) % 960,
      (i * 71 + state.time * 35) % 540,
      i % 3 ? 2 : 3,
      i % 3 ? 2 : 3,
    );
  }
}
function ship(s) {
  ctx.fillStyle = "#85e9d0";
  ctx.beginPath();
  ctx.moveTo(s.x + s.w / 2, s.y);
  ctx.lineTo(s.x + s.w, s.y + s.h);
  ctx.lineTo(s.x + s.w / 2, s.y + s.h - 8);
  ctx.lineTo(s.x, s.y + s.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffcf58";
  ctx.fillRect(s.x + 12, s.y + 34, 10, 12);
}
function update(dt) {
  state.time += dt;
  if (mode === "space") {
    const s = state.ship,
      speed = 340;
    if (keys.has("ArrowLeft") || keys.has("a")) s.x -= speed * dt;
    if (keys.has("ArrowRight") || keys.has("d")) s.x += speed * dt;
    if (keys.has("ArrowUp") || keys.has("w")) s.y -= speed * dt;
    if (keys.has("ArrowDown") || keys.has("s")) s.y += speed * dt;
    s.x = clamp(s.x, 0, 926);
    s.y = clamp(s.y, 20, 490);
    state.fire -= dt;
    if (keys.has(" ") && state.fire <= 0) {
      state.bullets.push({ x: s.x + 14, y: s.y, w: 7, h: 18 });
      state.fire = 0.18;
    }
    state.spawn -= dt;
    if (state.spawn <= 0) {
      state.rocks.push({ x: random(20, 900), y: -45, w: 38, h: 38 });
      state.spawn = Math.max(0.2, 0.8 - level * 0.06);
    }
    for (const b of state.bullets) b.y -= 640 * dt;
    for (const r of state.rocks) r.y += (100 + level * 20) * dt;
    for (const r of state.rocks) {
      if (intersects(s, r)) {
        finish();
        return;
      }
      for (const b of state.bullets)
        if (intersects(r, b)) {
          r.y = 700;
          b.y = -100;
          score += 50;
        }
    }
    state.rocks = state.rocks.filter((r) => r.y < 580);
    state.bullets = state.bullets.filter((b) => b.y > -30);
    score += dt * 5;
    backdrop();
    for (const b of state.bullets) {
      ctx.fillStyle = "#ffdb75";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    for (const r of state.rocks) {
      ctx.fillStyle = "#a893b5";
      ctx.beginPath();
      ctx.arc(r.x + 19, r.y + 19, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6c607c";
      ctx.beginPath();
      ctx.arc(r.x + 14, r.y + 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ship(s);
  }
  if (mode === "racer") {
    if (keys.has("ArrowLeft") || keys.has("a")) state.x -= 400 * dt;
    if (keys.has("ArrowRight") || keys.has("d")) state.x += 400 * dt;
    state.x = clamp(state.x, 255, 705);
    state.spawn -= dt;
    if (state.spawn <= 0) {
      state.cars.push({
        x: [310, 425, 540, 655][Math.floor(random(0, 4))],
        y: -110,
        w: 58,
        h: 94,
      });
      state.spawn = Math.max(0.4, 1.15 - level * 0.07);
    }
    for (const car of state.cars) {
      car.y += (210 + level * 22) * dt;
      if (intersects({ x: state.x - 29, y: 400, w: 58, h: 94 }, car)) {
        finish("Watch the road!");
        return;
      }
    }
    state.cars = state.cars.filter((c) => c.y < 560);
    score += dt * 18;
    ctx.fillStyle = title.includes("Snow") ? "#d6eff1" : "#6cab79";
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#273342";
    ctx.fillRect(225, 0, 510, 540);
    ctx.fillStyle = "#f2db78";
    ctx.fillRect(225, 0, 8, 540);
    ctx.fillRect(727, 0, 8, 540);
    ctx.fillStyle = "#edf5e2";
    for (let y = -100; y < 550; y += 110) {
      const yy = y + ((state.time * 240) % 110);
      for (const x of [352, 480, 606]) ctx.fillRect(x, yy, 5, 55);
    }
    function car(x, y, color) {
      ctx.fillStyle = "#12232c";
      ctx.fillRect(x - 5, y + 15, 68, 17);
      ctx.fillRect(x - 5, y + 65, 68, 17);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 58, 94);
      ctx.fillStyle = "#9fe9ed";
      ctx.fillRect(x + 8, y + 17, 42, 22);
      ctx.fillStyle = "#ffe3a3";
      ctx.fillRect(x + 5, y + 5, 12, 5);
      ctx.fillRect(x + 42, y + 5, 12, 5);
    }
    for (const c of state.cars) car(c.x, c.y, "#9978df");
    car(state.x - 29, 400, "#ff7050");
  }
  if (mode === "snake") {
    state.step += dt;
    if (state.step > Math.max(0.065, 0.2 - level * 0.014)) {
      state.step = 0;
      state.dir = state.next;
      state.turnLocked = false;
      const head = {
        x: state.snake[0].x + state.dir.x,
        y: state.snake[0].y + state.dir.y,
      };
      const eat = head.x === state.food.x && head.y === state.food.y;
      const body = eat ? state.snake : state.snake.slice(0, -1);
      if (
        head.x < 0 ||
        head.x >= 30 ||
        head.y < 0 ||
        head.y >= 16 ||
        body.some((p) => p.x === head.x && p.y === head.y)
      ) {
        finish();
        return;
      }
      state.snake.unshift(head);
      if (eat) {
        score += 100;
        const available = [];
        for (let y = 0; y < 16; y++)
          for (let x = 0; x < 30; x++)
            if (!state.snake.some((p) => p.x === x && p.y === y))
              available.push({ x, y });
        if (!available.length) {
          finish("You filled the garden!");
          return;
        }
        state.food = available[Math.floor(Math.random() * available.length)];
      } else state.snake.pop();
    }
    ctx.fillStyle = "#14362e";
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#1b4035";
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 30; x++)
        if ((x + y) % 2) ctx.fillRect(x * 32, y * 32 + 14, 32, 32);
    for (let i = 0; i < state.snake.length; i++) {
      ctx.fillStyle = i ? "#83d881" : "#d4f276";
      ctx.fillRect(
        state.snake[i].x * 32 + 2,
        state.snake[i].y * 32 + 16,
        28,
        28,
      );
    }
    ctx.fillStyle = "#ff7c82";
    ctx.beginPath();
    ctx.arc(state.food.x * 32 + 16, state.food.y * 32 + 30, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mode === "breakout") {
    if (keys.has("ArrowLeft") || keys.has("a")) state.paddle -= 560 * dt;
    if (keys.has("ArrowRight") || keys.has("d")) state.paddle += 560 * dt;
    state.paddle = clamp(state.paddle, 85, 875);
    const b = state.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 10) {
      b.x = 10;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > 950) {
      b.x = 950;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y < 10) {
      b.y = 10;
      b.vy = Math.abs(b.vy);
    }
    if (
      b.y > 490 &&
      b.y < 510 &&
      b.x > state.paddle - 85 &&
      b.x < state.paddle + 85 &&
      b.vy > 0
    ) {
      const offset = b.x - state.paddle;
      const direction = Math.sign(offset) || Math.sign(b.vx) || 1;
      b.vx = direction * clamp(Math.abs(offset) * 5, 90, 340);
      b.vy = -Math.sqrt(Math.max(10000, (360 + level * 18) ** 2 - b.vx ** 2));
      b.y = 487;
    }
    if (b.y > 555) {
      finish();
      return;
    }
    for (const brick of state.bricks) {
      if (intersects({ x: b.x - 8, y: b.y - 8, w: 16, h: 16 }, brick)) {
        brick.dead = true;
        const previousX = b.x - b.vx * dt;
        if (previousX + 8 <= brick.x && b.vx > 0) {
          b.x = brick.x - 8;
          b.vx = -Math.abs(b.vx);
        } else if (previousX - 8 >= brick.x + brick.w && b.vx < 0) {
          b.x = brick.x + brick.w + 8;
          b.vx = Math.abs(b.vx);
        } else {
          b.y = b.vy > 0 ? brick.y - 8 : brick.y + brick.h + 8;
          b.vy = -b.vy;
        }
        score += 100;
        break;
      }
    }
    state.bricks = state.bricks.filter((b) => !b.dead);
    if (!state.bricks.length) {
      finish("All bricks cleared!");
      return;
    }
    backdrop();
    for (const brick of state.bricks) {
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    }
    ctx.fillStyle = "#87e9da";
    ctx.fillRect(state.paddle - 85, 500, 170, 15);
    ctx.fillStyle = "#fff4c4";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mode === "runner") {
    state.vy += 1600 * dt;
    state.y += state.vy * dt;
    if (state.y > 395) {
      state.y = 395;
      state.vy = 0;
    }
    state.spawn -= dt;
    if (state.spawn <= 0) {
      state.obstacles.push({ x: 980, y: 400, w: random(25, 45), h: 35 });
      state.spawn = random(1.1, 1.7) - level * 0.04;
    }
    for (const o of state.obstacles) {
      o.x -= (270 + level * 25) * dt;
      if (intersects({ x: 185, y: state.y, w: 34, h: 40 }, o)) {
        finish("One more jump?");
        return;
      }
    }
    state.obstacles = state.obstacles.filter((o) => o.x > -70);
    score += dt * 15;
    ctx.fillStyle = "#71bfce";
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#c0eee1";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(
        ((i * 210 - state.time * 25 + 2000) % 1200) - 100,
        70 + (i % 3) * 50,
        80,
        22,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#355c46";
    ctx.fillRect(0, 435, 960, 105);
    ctx.fillStyle = "#a5df68";
    ctx.fillRect(0, 435, 960, 12);
    ctx.fillStyle = "#ffe475";
    ctx.fillRect(185, state.y, 34, 40);
    ctx.fillStyle = "#244631";
    ctx.fillRect(207, state.y + 10, 5, 5);
    for (const o of state.obstacles) {
      ctx.fillStyle = "#ac5066";
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  }
  if (mode === "duel") {
    if (keys.has("w")) state.left -= 430 * dt;
    if (keys.has("s")) state.left += 430 * dt;
    if (keys.has("ArrowUp")) state.right -= 430 * dt;
    if (keys.has("ArrowDown")) state.right += 430 * dt;
    state.left = clamp(state.left, 0, 430);
    state.right = clamp(state.right, 0, 430);
    const b = state.ball;
    const previousX = b.x;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < 10 || b.y > 530) {
      b.y = clamp(b.y, 10, 530);
      b.vy = -b.vy;
    }
    if (
      previousX >= 58 &&
      b.x <= 58 &&
      b.y + 10 > state.left &&
      b.y - 10 < state.left + 110 &&
      b.vx < 0
    ) {
      b.x = 58;
      b.vx = Math.min(780, Math.abs(b.vx) * 1.035);
      b.vy = (b.y - state.left - 55) * 5;
    }
    if (
      previousX <= 902 &&
      b.x >= 902 &&
      b.y + 10 > state.right &&
      b.y - 10 < state.right + 110 &&
      b.vx > 0
    ) {
      b.x = 902;
      b.vx = -Math.min(780, Math.abs(b.vx) * 1.035);
      b.vy = (b.y - state.right - 55) * 5;
    }
    if (b.x < -20 || b.x > 980) {
      if (b.x < 0) state.b++;
      else state.a++;
      score = Math.max(state.a, state.b) * 100;
      updateScore(`${state.a} — ${state.b}`);
      if (state.a === 7 || state.b === 7) {
        finish(`Player ${state.a === 7 ? "1" : "2"} wins!`);
        return;
      }
      b.x = 480;
      b.y = 270;
      b.vx = (Math.random() > 0.5 ? 1 : -1) * (300 + level * 10);
      b.vy = random(-200, 200);
    }
    ctx.fillStyle = "#17283a";
    ctx.fillRect(0, 0, 960, 540);
    ctx.strokeStyle = "#355169";
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(480, 0);
    ctx.lineTo(480, 540);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#84ead1";
    ctx.fillRect(30, state.left, 18, 110);
    ctx.fillStyle = "#ffbf85";
    ctx.fillRect(912, state.right, 18, 110);
    ctx.fillStyle = "#fff1bb";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${state.a}       ${state.b}`, 480, 65);
  }
  if (mode === "clicker") {
    state.elapsed += dt;
    if (state.elapsed >= 1) {
      state.elapsed -= 1;
      state.seeds += state.growers;
      score += state.growers;
      refreshGarden();
    }
  }
  if (mode !== "duel" && mode !== "memory") updateScore();
}
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!over && !paused) {
    const steps = Math.max(1, Math.ceil(dt / 0.025));
    for (let i = 0; i < steps && !over; i++) update(dt / steps);
  }
  requestAnimationFrame(tick);
}
reset(false);
requestAnimationFrame(tick);
window.parent.postMessage({ type: "sprout:ready" }, location.origin);
