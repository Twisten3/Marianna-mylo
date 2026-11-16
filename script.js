const canvas = document.querySelector("#bouquet");
const context = canvas.getContext("2d");
const stage = document.querySelector(".bouquet-stage");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const startedAt = performance.now();

let width = 0;
let height = 0;
let unit = 0;
let columns = 0;
let rows = 0;
let stars = [];
let shootingStars = [];
let fireworkSparks = [];
let animationFrame = 0;
let previousFrame = 0;
let nextShootingStarAt = 1.1;
let nextFireworkAt = 1.6;

const roseLayers = [
  { count: 5, x: 0.3, step: 0.1, y: 0.24, curve: 0.04, scale: 0.72, scaleCurve: 0.16 },
  { count: 7, x: 0.22, step: 0.093, y: 0.32, curve: 0.035, scale: 0.68, scaleCurve: 0.18 },
  { count: 9, x: 0.14, step: 0.09, y: 0.4, curve: 0.03, scale: 0.64, scaleCurve: 0.18 },
  { count: 7, x: 0.22, step: 0.093, y: 0.48, curve: 0.025, scale: 0.6, scaleCurve: 0.18 },
  { count: 5, x: 0.3, step: 0.1, y: 0.55, curve: 0.015, scale: 0.52, scaleCurve: 0.18 }
];

const roseCenters = roseLayers.flatMap((layer) => Array.from({ length: layer.count }, (_, index) => {
  const distanceFromCenter = Math.abs(index - (layer.count - 1) / 2) / Math.max(1, (layer.count - 1) / 2);
  const seed = index + layer.y * 100;
  return {
    x: layer.x + index * layer.step + (randomFrom(seed + 5) - 0.5) * 0.018,
    y: layer.y + distanceFromCenter * layer.curve + (randomFrom(seed + 12) - 0.5) * 0.018,
    scale: layer.scale + (1 - distanceFromCenter) * layer.scaleCurve + (randomFrom(seed + 24) - 0.5) * 0.08
  };
}));

const palette = {
  rose: ["#ff75a9", "#ec4f8d", "#f48fb1", "#ed5f9a", "#ffb5cc", "#f29ab5"],
  stem: ["#d94f8c", "#ed73a7", "#bd477b"]
};

const fireworkColors = ["#f9b9cf", "#f8d77e", "#b9dfff", "#d6b8ff", "#fff1bd"];

function randomFrom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  unit = Math.min(width, height * 1.05);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  columns = Math.max(48, Math.floor(width / 7.2));
  rows = Math.max(48, Math.floor(height / 11));
  stars = Array.from({ length: Math.min(240, Math.floor((width * height) / 2100)) }, (_, index) => ({
    x: randomFrom(index + 1),
    y: randomFrom(index + 99),
    phase: randomFrom(index + 221) * Math.PI * 2,
    size: randomFrom(index + 700) > 0.9 ? 1.7 : 1
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
  const radius = 0.12 * unit * scale;
  const dx = (x - center.x * width) / radius;
  const dy = (y - center.y * height) / radius;
  const radialDistance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const edge = 0.82 + 0.12 * Math.sin(angle * 7 + radialDistance * 11 - time * 0.35)
    + 0.07 * Math.sin(angle * 13 - radialDistance * 18);

  if (radialDistance > edge) return null;

  const centerGlow = Math.max(0, 1 - radialDistance / 0.36);
  const petalFold = Math.sin(angle * 5 + radialDistance * 16);
  const spiral = Math.abs(Math.sin(angle * 2.4 + radialDistance * 18 - time * 0.25));
  return {
    kind: "rose",
    glow: centerGlow,
    radialDistance,
    inner: radialDistance < 0.2,
    seam: radialDistance > 0.22 && Math.abs(petalFold) < 0.2,
    highlight: spiral > 0.92
  };
}

function sampleBouquet(x, y, time, growth) {
  if (growth < 0.025) return null;

  let flowerShape = null;
  for (const rose of roseCenters) {
    if (growth < 0.04) break;
    const center = {
      x: 0.5 + (rose.x - 0.5) * growth,
      y: 0.72 + (rose.y - 0.72) * growth
    };
    const radius = 0.12 * unit * rose.scale * growth;
    if (Math.abs(x - center.x * width) > radius || Math.abs(y - center.y * height) > radius) continue;
    const shape = roseAt(x, y, center, time, rose.scale * growth);
    if (shape && (!flowerShape || shape.glow > flowerShape.glow)) flowerShape = shape;
  }
  if (flowerShape) return flowerShape;

  const tieY = height * 0.58;
  for (const rose of roseCenters) {
    const flowerX = width * (0.5 + (rose.x - 0.5) * growth);
    const flowerY = height * (0.72 + (rose.y - 0.72) * growth + 0.04 * growth);
    const stemX = width * (0.5 + (rose.x - 0.5) * growth * 0.28);
    const thickness = unit * (0.002 + growth * 0.003);
    if (x < Math.min(flowerX, stemX) - thickness || x > Math.max(flowerX, stemX) + thickness
      || y < Math.min(flowerY, tieY) - thickness || y > Math.max(flowerY, tieY) + thickness) continue;
    if (distanceToSegment(x, y, flowerX, flowerY, stemX, tieY) < thickness) {
      return { kind: "stem", glow: 0.45, highlight: randomFrom(Math.floor(x + y)) > 0.8 };
    }
  }

  const bundleEnd = height * 0.73;
  if (growth > 0.3 && Math.abs(y - tieY) < unit * 0.008 && Math.abs(x - width * 0.5) < unit * 0.07) {
    return { kind: "stem", glow: 0.8, highlight: true };
  }
  if (growth > 0.3 && distanceToSegment(x, y, width * 0.5, tieY, width * 0.5, bundleEnd) < unit * 0.006) {
    return { kind: "stem", glow: 0.45, highlight: randomFrom(Math.floor(x + y)) > 0.8 };
  }

  return null;
}

function colorFor(shape, x, y, time) {
  const colors = palette[shape.kind];
  const variation = Math.floor(randomFrom(Math.floor(x * 2 + y * 4 + time * 1.6)) * colors.length);
  if (shape.kind === "rose" && shape.inner) return shape.highlight ? "#fff0f5" : "#ffc1d6";
  if (shape.kind === "rose" && shape.seam) return "#bd376f";
  if (shape.kind === "rose" && shape.highlight) return "#ffb4cc";
  if (shape.highlight) return colors[0];
  if (shape.glow > 0.76) return colors[(variation + 1) % colors.length];
  return colors[variation];
}

function growthAt(time) {
  const progress = Math.max(0, Math.min(1, (time - 0.8) / 10));
  return progress * progress * (3 - 2 * progress);
}

function drawStars(time) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.max(8, width / columns)}px monospace`;

  for (let index = 0; index < stars.length; index += 1) {
    const star = stars[index];
    const pulse = reducedMotion ? 0.62 : 0.28 + 0.6 * (0.5 + 0.5 * Math.sin(time * 1.1 + star.phase));
    context.globalAlpha = pulse;
    context.fillStyle = star.size > 1 ? "#ead6f5" : "#b7b2d8";
    context.fillText(star.size > 1 ? "✦" : "·", star.x * width, star.y * height);
  }
  context.globalAlpha = 1;
}

function launchShootingStar(time) {
  const length = unit * (0.08 + Math.random() * 0.08);
  shootingStars.push({
    x: Math.random() * width,
    y: height * (0.04 + Math.random() * 0.36),
    length,
    speed: unit * (0.32 + Math.random() * 0.2),
    life: 1,
    duration: 0.65 + Math.random() * 0.55,
    color: Math.random() > 0.5 ? "#e6ddff" : "#ffd8e4"
  });
  nextShootingStarAt = time + 1.4 + Math.random() * 2.2;
}

function drawShootingStars(delta) {
  shootingStars = shootingStars.filter((star) => star.life > 0 && star.x < width + star.length && star.y < height);
  for (const star of shootingStars) {
    star.x += star.speed * delta;
    star.y += star.speed * 0.34 * delta;
    star.life -= delta / star.duration;

    context.globalAlpha = Math.max(0, star.life);
    context.lineWidth = 1.4;
    context.strokeStyle = star.color;
    context.beginPath();
    context.moveTo(star.x - star.length, star.y - star.length * 0.34);
    context.lineTo(star.x, star.y);
    context.stroke();
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(star.x, star.y, 1.4, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function launchFirework(time) {
  const x = width * (0.13 + Math.random() * 0.74);
  const y = height * (0.1 + Math.random() * 0.2);
  const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
  const sparkCount = Math.round(28 + Math.random() * 14);

  for (let index = 0; index < sparkCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = unit * (0.1 + Math.random() * 0.22);
    const duration = 1.6 + Math.random() * 0.8;
    fireworkSparks.push({
      x,
      y,
      previousX: x,
      previousY: y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      duration,
      life: duration,
      color
    });
  }
  nextFireworkAt = time + 2 + Math.random();
}

function drawFireworks(delta) {
  fireworkSparks = fireworkSparks.filter((spark) => spark.life > 0);
  for (const spark of fireworkSparks) {
    spark.previousX = spark.x;
    spark.previousY = spark.y;
    spark.x += spark.velocityX * delta;
    spark.y += spark.velocityY * delta;
    spark.velocityY += unit * 0.16 * delta;
    spark.life -= delta;

    context.globalAlpha = Math.max(0, spark.life / spark.duration);
    context.strokeStyle = spark.color;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(spark.previousX, spark.previousY);
    context.lineTo(spark.x, spark.y);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawBouquet(time, growth) {
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const fontSize = Math.min(cellWidth * 1.12, cellHeight * 0.92);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${fontSize}px "SFMono-Regular", Menlo, Monaco, Consolas, monospace`;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      const shape = sampleBouquet(x, y, time, growth);
      if (!shape) continue;

      const choice = randomFrom(row * 257 + column * 73 + Math.floor(time * 2));
      const glyphs = shape.kind === "rose"
        ? shape.inner ? "@%*@%+" : shape.seam ? "/\\|:" : shape.radialDistance > 0.65 ? "+;:." : "%*&+;."
        : "/\\|:.";
      const glyph = glyphs[Math.floor(choice * glyphs.length)];
      context.globalAlpha = shape.kind === "rose"
        ? 0.82 + shape.glow * 0.18
        : 0.72 + shape.glow * 0.28;
      context.fillStyle = colorFor(shape, x, y, time);
      context.fillText(glyph, x, y);
    }
  }

  if (growth > 0.04) {
    const markerSize = Math.min(cellWidth * 1.35, cellHeight * 1.05) * growth;
    context.font = `bold ${markerSize}px monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.globalAlpha = Math.min(1, growth * 1.4);
    for (const [index, rose] of roseCenters.entries()) {
      const centerX = width * (0.5 + (rose.x - 0.5) * growth);
      const centerY = height * (0.72 + (rose.y - 0.72) * growth);
      context.fillStyle = index % 2 === 0 ? "#ff9fbe" : "#ffb5cc";
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = petal * Math.PI * 2 / 5;
        context.fillText(
          "@",
          centerX + Math.cos(angle) * markerSize * 0.78,
          centerY + Math.sin(angle) * markerSize * 0.78
        );
        const innerAngle = angle + Math.PI / 5;
        context.fillText(
          "%",
          centerX + Math.cos(innerAngle) * markerSize * 0.38,
          centerY + Math.sin(innerAngle) * markerSize * 0.38
        );
      }
      context.fillStyle = "#fff0f5";
      context.fillText("@", centerX, centerY);
    }
  }

  context.globalAlpha = 1;
}

function drawDedication(time) {
  const message = "For you, Marianna";
  const fontSize = Math.min(24, width * 0.06);
  const startTime = reducedMotion ? 0 : 10.8;
  const rawTypingProgress = Math.max(0, (time - startTime) * 8);
  const typingProgress = Math.min(message.length, rawTypingProgress);
  if (typingProgress <= 0) return;

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = `italic ${fontSize}px Georgia, serif`;
  context.fillStyle = "#ffd7e5";
  context.shadowColor = "#f58cab";
  context.shadowBlur = fontSize * 0.65;

  const textWidth = context.measureText(message).width;
  const gap = fontSize * 0.45;
  const x = (width - textWidth - gap - fontSize * 1.3) / 2;
  const y = height * 0.86;
  const completeCharacters = Math.floor(typingProgress);
  const visibleText = message.slice(0, completeCharacters);
  context.globalAlpha = 0.95;
  context.fillText(visibleText, x, y);

  if (completeCharacters < message.length) {
    context.globalAlpha = typingProgress - completeCharacters;
    context.fillText(message[completeCharacters], x + context.measureText(visibleText).width, y);
  }

  const heartProgress = Math.min(1, Math.max(0, rawTypingProgress - message.length - 0.35));
  if (heartProgress > 0) {
    context.font = `${fontSize * 1.3}px Georgia, serif`;
    context.globalAlpha = heartProgress * (0.78 + Math.sin(time * 4) * 0.22);
    context.fillText("♡", x + textWidth + gap, y);
  }
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function render(now) {
  const time = (now - startedAt) / 1000;
  const delta = previousFrame === 0 ? 1 / 60 : Math.min(0.05, (now - previousFrame) / 1000);
  const growth = reducedMotion ? 1 : growthAt(time);
  previousFrame = now;

  context.clearRect(0, 0, width, height);
  drawStars(time);
  if (!reducedMotion && time >= nextShootingStarAt) launchShootingStar(time);
  if (!reducedMotion && time >= nextFireworkAt) launchFirework(time);
  drawShootingStars(delta);
  drawFireworks(delta);
  drawBouquet(time, growth);
  drawDedication(time);
  animationFrame = window.requestAnimationFrame(render);
}

const observer = new ResizeObserver(resizeCanvas);
observer.observe(stage);
resizeCanvas();
animationFrame = window.requestAnimationFrame(render);

window.addEventListener("pagehide", () => {
  window.cancelAnimationFrame(animationFrame);
});
