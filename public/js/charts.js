// charts.js - Gráficos desenhados em Canvas puro (sem bibliotecas)

// Gráfico de barras verticais
function drawBarChart(canvas, labels, values, colors) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const css = getComputedStyle(document.documentElement);
  const muted = css.getPropertyValue("--muted").trim();
  const border = "rgba(139,148,158,0.15)";

  const max = Math.max(...values, 1);
  const padL = 28, padB = 30, padT = 14;
  const chartW = W - padL - 10, chartH = H - padT - padB;

  // Linhas de grade + eixo Y
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = muted;
  const steps = Math.min(max, 4);
  for (let i = 0; i <= steps; i++) {
    const v = Math.round((max / steps) * i);
    const y = padT + chartH - (v / max) * chartH;
    ctx.strokeStyle = border; ctx.beginPath();
    ctx.moveTo(padL, y); ctx.lineTo(W - 10, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(String(v), padL - 6, y + 3);
  }

  // Barras
  const n = labels.length;
  const slot = chartW / n, barW = Math.min(slot * 0.5, 46);
  labels.forEach((label, i) => {
    const h = (values[i] / max) * chartH;
    const x = padL + slot * i + (slot - barW) / 2;
    const y = padT + chartH - h;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, [4, 4, 0, 0]);
    ctx.fill();
    // Rótulo
    ctx.fillStyle = muted; ctx.textAlign = "center";
    ctx.fillText(label, padL + slot * i + slot / 2, H - 12);
    // Valor
    if (values[i] > 0) {
      ctx.fillStyle = colors[i];
      ctx.fillText(String(values[i]), padL + slot * i + slot / 2, y - 5);
    }
  });
}

// Gráfico de rosca (donut)
function drawDonutChart(canvas, labels, values, colors) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const total = values.reduce((a, b) => a + b, 0);
  const cx = W / 3, cy = H / 2, r = 78, inner = 48;
  let start = -Math.PI / 2;

  if (total === 0) {
    ctx.strokeStyle = "rgba(139,148,158,0.2)"; ctx.lineWidth = r - inner;
    ctx.beginPath(); ctx.arc(cx, cy, (r + inner) / 2, 0, Math.PI * 2); ctx.stroke();
  } else {
    values.forEach((v, i) => {
      if (v === 0) return;
      const angle = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = colors[i]; ctx.fill();
      start += angle;
    });
    // Furo central
    const css = getComputedStyle(document.documentElement);
    ctx.fillStyle = css.getPropertyValue("--panel").trim() || "#161b22";
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fill();
    // Total no centro
    ctx.fillStyle = css.getPropertyValue("--text").trim();
    ctx.font = "700 20px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(total), cx, cy);
  }

  // Legenda
  const css2 = getComputedStyle(document.documentElement);
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.font = "11px 'Inter', sans-serif";
  labels.forEach((label, i) => {
    const y = H / 2 - (labels.length * 20) / 2 + i * 20 + 10;
    ctx.fillStyle = colors[i];
    ctx.beginPath(); ctx.roundRect(W * 0.62, y - 4, 8, 8, 2); ctx.fill();
    ctx.fillStyle = css2.getPropertyValue("--muted").trim();
    ctx.fillText(`${label} (${values[i]})`, W * 0.62 + 14, y);
  });
}
