/* Analog instrumentation-style gauge (1-5 CMM scale), rendered as SVG.
   Signature visual element: evokes an OT/SCADA panel gauge rather than
   a generic progress ring. */

function renderGauge(containerEl, score, options = {}) {
  const size = options.size || 220;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const startAngle = 210, endAngle = -30; // sweep 240deg, like an analog dial
  const clamped = Math.max(1, Math.min(5, score || 1));

  const bands = [
    { from: 1, to: 2, color: "#E5734D" },
    { from: 2, to: 3, color: "#E8A33D" },
    { from: 3, to: 4, color: "#4FD1C5" },
    { from: 4, to: 5, color: "#4DAF7C" },
  ];

  function angleFor(v) {
    const t = (v - 1) / 4;
    return startAngle + t * (endAngle - startAngle);
  }
  function polar(angleDeg, radius) {
    const a = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)];
  }
  function arcPath(a1, a2, radius) {
    const [x1, y1] = polar(a1, radius);
    const [x2, y2] = polar(a2, radius);
    const largeArc = Math.abs(a2 - a1) > 180 ? 1 : 0;
    const sweep = a2 < a1 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  }

  let bandArcs = "";
  bands.forEach(b => {
    const a1 = angleFor(b.from), a2 = angleFor(b.to);
    bandArcs += `<path d="${arcPath(a1, a2, r)}" stroke="${b.color}" stroke-width="14" fill="none" stroke-linecap="butt" opacity="0.85"/>`;
  });

  let ticks = "";
  for (let v = 1; v <= 5; v++) {
    const a = angleFor(v);
    const [x1, y1] = polar(a, r + 12);
    const [x2, y2] = polar(a, r + 2);
    const [tx, ty] = polar(a, r + 26);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5B6774" stroke-width="1.5"/>`;
    ticks += `<text x="${tx}" y="${ty}" fill="#8B98A5" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle" dominant-baseline="middle">${v}</text>`;
  }

  const needleAngle = angleFor(clamped);
  const [nx, ny] = polar(needleAngle, r - 6);

  const svg = `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Maturity gauge showing score ${clamped.toFixed(1)} out of 5">
    ${bandArcs}
    ${ticks}
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#E6ECF1" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="#E6ECF1"/>
    <text x="${cx}" y="${cy + r * 0.62}" fill="#E6ECF1" font-size="26" font-weight="700" font-family="Space Grotesk, sans-serif" text-anchor="middle">${clamped.toFixed(1)}</text>
    <text x="${cx}" y="${cy + r * 0.62 + 18}" fill="#8B98A5" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle" letter-spacing="1">OUT OF 5.0</text>
  </svg>`;

  containerEl.innerHTML = svg;
}

if (typeof module !== "undefined") {
  module.exports = { renderGauge };
}
