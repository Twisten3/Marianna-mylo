const canvas = document.querySelector("#bouquet");
const context = canvas.getContext("2d");
const stage = document.querySelector(".bouquet-stage");
const elapsedLabel = document.querySelector("#elapsed");
const petalCountLabel = document.querySelector("#petal-count");
const bloomButton = document.querySelector("#bloom-button");
const loveNote = document.querySelector("#love-note");
const announcement = document.querySelector("#announcement");
const startedAt = performance.now();

let width = 0;
let height = 0;
let columns = 0;
let rows = 0;
let frame = 0;
let fallenPetals = 0;
let petals = [];
let stars = [];
let animationFrame = 0;

const palette = {
  rose: ["#e04e67", "#c93d58", "#f06b7d", "#a9324d"],
  leaf: ["#4c9966", "#65b77c", "#347d53"],
  paper: ["#a6a1ac", "#c5bec8", "#777480"],
  gold: ["#ead37e", "#d0b85e", "#f4e3a0"]
};

function randomFrom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  columns = Math.max(54, Math.floor(width / 7.2));
  rows = Math.max(42, Math.floor(height / 10));
  stars = Array.from({ length: Math.floor((width * height) / 3200) }, (_, index) => ({
    x: randomFrom(index + 1),
    y: randomFrom(index + 99),
    phase: randomFrom(index + 221) * Math.PI * 2,
    size: randomFrom(index + 700) > 0.87 ? 1.7 : 1
  }));
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roseAt(x, y, center, time, scale) {
  const radius = 0.135 * width * scale;
  const dx = (x - center.x * width) / radius;
  const dy = (y - center.y * height) / radius;
  const radialDistance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const edge = 0.82 + 0.11 * Math.sin(angle * 7 + radialDistance * 11 - time * 0.7)
    + 0.06 * Math.sin(angle * 13 - radialDistance * 18);

  if (radialDistance > edge) return null;

  const centerGlow = Math.max(0, 1 - radialDistance / 0.36);
  const insideSpiral = Math.abs(Math.sin(angle * 2.2 + radialDistance * 13 - time * 0.5));
  return {
    kind: "rose",
    depth: radialDistance,
    glow: centerGlow,
    highlight: insideSpiral > 0.93
  };
}

function leafAt(x, y, centerX, centerY, direction, time) {
  const dx = x - centerX * width;
  const dy = y - centerY * height;
  const angle = direction * 0.58;
  const localX = (dx * Math.cos(angle) + dy * Math.sin(angle)) / (width * 0.065);
  const localY = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / (width * 0.034);
  const edge = Math.abs(localX) + Math.abs(localY) * 0.76;

  if (edge > 1 || Math.abs(localY) < 0.08) return null;

  return {
    kind: "leaf",
    glow: Math.max(0, 1 - edge),
    highlight: Math.abs(localY - localX * 0.32 * Math.sign(direction)) < 0.06 + Math.sin(time) * 0.015
  };
}

function sampleBouquet(x, y, time) {
  const roseCenters = [
    { x: 0.405, y: 0.34, scale: 0.87 },
    { x: 0.5, y: 0.29, scale: 1.08 },
    { x: 0.595, y: 0.35, scale: 0.84 },
    { x: 0.32, y: 0.41, scale: 0.55 },
    { x: 0.68, y: 0.42, scale: 0.54 }
  ];

  for (const rose of roseCenters) {
    const shape = roseAt(x, y, rose, time, rose.scale);
    if (shape) return shape;
  }

  const tieY = height * 0.72;
  const stemStarts = [0.405, 0.46, 0.5, 0.54, 0.595];
  for (const start of stemStarts) {
    const flower = roseCenters[stemStarts.indexOf(start)];
    const stemX = width * start;
    const flowerX = width * flower.x;
    const flowerY = height * (flower.y + 0.1);
    const stemThickness = distanceToSegment(x, y, flowerX, flowerY, stemX, tieY);
    if (stemThickness < width * 0.006) {
      return { kind: "leaf", glow: 0.6, highlight: randomFrom(Math.floor(x + y)) > 0.55 };
    }
  }

  const leaves = [
    [0.34, 0.55, -1],
    [0.39, 0.62, 1],
    [0.44, 0.53, -1],
    [0.56, 0.54, 1],
    [0.61, 0.62, -1],
    [0.66, 0.54, 1],
    [0.49, 0.59, 1],
    [0.54, 0.65, -1]
  ];
  for (const [leafX, leafY, direction] of leaves) {
    const leaf = leafAt(x, y, leafX, leafY, direction, time);
    if (leaf) return leaf;
  }

  if (y > tieY - 5 && y < tieY + height * 0.025 && x > width * 0.455 && x < width * 0.545) {
    return { kind: "gold", glow: 0.8, highlight: Math.abs(x - width * 0.5) < width * 0.012 };
  }

  if (y > height * 0.73 && y < height * 0.91) {
    const tailLeft = distanceToSegment(x, y, width * 0.47, tieY, width * 0.39, height * 0.9);
    const tailRight = distanceToSegment(x, y, width * 0.53, tieY, width * 0.61, height * 0.89);
    if (Math.min(tailLeft, tailRight) < width * 0.006) {
      return { kind: "gold", glow: 0.6, highlight: randomFrom(Math.floor(x + y)) > 0.8 };
    }
  }

  const wrapperLines = [
    [0.27, 0.35, 0.2, 0.61],
    [0.73, 0.36, 0.8, 0.61],
    [0.2, 0.61, 0.48, 0.75],
    [0.8, 0.61, 0.52, 0.75]
  ];
  for (const [x1, y1, x2, y2] of wrapperLines) {
    if (distanceToSegment(x, y, width * x1, height * y1, width * x2, height * y2) < width * 0.004) {
      return { kind: "paper", glow: 0.5, highlight: randomFrom(Math.floor(x + y)) > 0.72 };
    }
  }

  return null;
}

function colorFor(shape, x, y, time) {
  const colors = palette[shape.kind];
  const variation = Math.floor(randomFrom(Math.floor(x * 2 + y * 4 + time * 1.6)) * colors.length);
  if (shape.highlight) return shape.kind === "rose" ? "#ff9ba9" : colors[0];
  if (shape.glow > 0.76) return colors[(variation + 1) % colors.length];
  return colors[variation];
}

function drawStars(time) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.max(8, width / columns)}px monospace`;

  for (let index = 0; index < stars.length; index += 1) {
    const star = stars[index];
    const pulse = 0.28 + 0.6 * (0.5 + 0.5 * Math.sin(time * 1.1 + star.phase));
    context.globalAlpha = pulse;
    context.fillStyle = star.size > 1 ? "#d9b8cb" : "#aaa2c3";
    context.fillText(star.size > 1 ? "+" : "·", star.x * width, star.y * height);
  }

  context.globalAlpha = 1;
}

function drawPetals(time) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.max(7, width / columns)}px monospace`;

  petals = petals.filter((petal) => petal.y < height + 12 && petal.life > 0);
  for (const petal of petals) {
    petal.x += petal.drift + Math.sin(time + petal.phase) * 0.3;
    petal.y += petal.speed;
    petal.life -= 0.003;
    context.globalAlpha = Math.min(1, petal.life);
    context.fillStyle = "#ff758d";
    context.fillText(petal.glyph, petal.x, petal.y);
  }
  context.globalAlpha = 1;
  petalCountLabel.textContent = `+${fallenPetals}`;
}

function render(now) {
  frame += 1;
  const time = (now - startedAt) / 1000;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const fontSize = Math.min(cellWidth * 1.06, cellHeight * 0.84);

  context.clearRect(0, 0, width, height);
  drawStars(time);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${fontSize}px "SFMono-Regular", Menlo, Monaco, Consolas, monospace`;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      const shape = sampleBouquet(x, y, time);
      if (!shape) continue;

      const choice = randomFrom(row * 257 + column * 73 + Math.floor(time * 2));
      const glyphs = shape.kind === "rose" ? "@%*&+;:." : shape.kind === "leaf" ? "&%+=-." : "/\\|:.*";
      const glyph = glyphs[Math.floor(choice * glyphs.length)];
      context.globalAlpha = 0.65 + shape.glow * 0.35;
      context.fillStyle = colorFor(shape, x, y, time);
      context.fillText(glyph, x, y);
    }
  }

  context.globalAlpha = 1;
  drawPetals(time);
  elapsedLabel.textContent = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
  animationFrame = window.requestAnimationFrame(render);
}

function addPetals() {
  for (let index = 0; index < 32; index += 1) {
    petals.push({
      x: width * (0.32 + Math.random() * 0.36),
      y: height * (0.28 + Math.random() * 0.27),
      speed: 0.7 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 0.8,
      phase: Math.random() * Math.PI * 2,
      life: 1,
      glyph: ["*", "✧", ".", "°"][Math.floor(Math.random() * 4)]
    });
  }
  fallenPetals += 32;
  announcement.textContent = "Пелюстки троянд летять. For you, Marianna.";
}

bloomButton.addEventListener("click", () => {
  const isOpen = bloomButton.getAttribute("aria-expanded") === "true";
  bloomButton.setAttribute("aria-expanded", String(!isOpen));
  loveNote.hidden = isOpen;
  bloomButton.innerHTML = isOpen
    ? '<span aria-hidden="true">✳</span> For you, Marianna'
    : '<span aria-hidden="true">✳</span> Ще разок для тебе';
  addPetals();
});

const observer = new ResizeObserver(resizeCanvas);
observer.observe(stage);
resizeCanvas();
animationFrame = window.requestAnimationFrame(render);

window.addEventListener("pagehide", () => {
  window.cancelAnimationFrame(animationFrame);
});
