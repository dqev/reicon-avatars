/**
 * Seed-Based SVG Avatar Generator
 * Pure JavaScript, zero dependencies.
 * Generates 100% deterministic, unique, aesthetic SVG avatars from any seed.
 */

// String hash (cyrb53)
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// PRNG (Mulberry32) - 100% deterministic state from seed
function createRnd(seedVal) {
  let s = typeof seedVal === 'number' ? seedVal : cyrb53(String(seedVal || 'avatar'));
  let a = s >>> 0;
  
  const rnd = function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  rnd.int = function(min, max) {
    return Math.floor(rnd() * (max - min + 1)) + min;
  };

  rnd.pick = function(arr) {
    return arr[Math.floor(rnd() * arr.length)];
  };

  rnd.float = function(min, max) {
    return rnd() * (max - min) + min;
  };

  return rnd;
}

// Deterministic ID generator (derived from PRNG sequence)
function nid(prefix, rnd) {
  const randSuffix = Math.floor(rnd() * 16777215).toString(36);
  return `${prefix}_${randSuffix}`;
}

// Geometry helpers
function f(v) {
  return Number(v.toFixed(3)).toString();
}

function starPath(cx, cy, rOut, rIn, n, rot = 0, roundR = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (rot * Math.PI / 180) + i * Math.PI / n - Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  if (roundR <= 0) {
    return "M" + pts.map(p => `${f(p[0])} ${f(p[1])}`).join("L") + "Z";
  }
  let d = "";
  const m = pts.length;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % m];
    const toward = (a, b, dist) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy);
      const t = Math.min(dist / (L || 1), 0.5);
      return [a[0] + dx * t, a[1] + dy * t];
    };
    const s = toward(p1, p0, roundR);
    const e = toward(p1, p2, roundR);
    d += (i === 0 ? "M" : "L") + `${f(s[0])} ${f(s[1])}`;
    d += `Q${f(p1[0])} ${f(p1[1])} ${f(e[0])} ${f(e[1])}`;
  }
  return d + "Z";
}

function blobPath(cx, cy, r, n, wob, rndFunc, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (rot * Math.PI / 180) + i * 2 * Math.PI / n;
    const rr = r * (1 + (rndFunc() * 2 - 1) * wob);
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

function flowerPetals(cx, cy, rCenter, rPetal, n, rot = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (rot * Math.PI / 180) + i * 2 * Math.PI / n;
    out.push({ x: cx + rCenter * Math.cos(a), y: cy + rCenter * Math.sin(a), r: rPetal });
  }
  return out;
}

function almond(cx, cy, w, h) {
  return `M${f(cx - w / 2)} ${f(cy)}C${f(cx - w / 4)} ${f(cy - h * 0.9)} ${f(cx + w / 4)} ${f(cy - h * 0.9)} ${f(cx + w / 2)} ${f(cy)}` +
         `C${f(cx + w / 4)} ${f(cy + h * 0.9)} ${f(cx - w / 4)} ${f(cy + h * 0.9)} ${f(cx - w / 2)} ${f(cy)}Z`;
}

function wave(x0, y, x1, amp, waves, sw, color, cap = "butt") {
  const seg = (x1 - x0) / (waves * 2);
  let d = `M${f(x0)} ${f(y)}`;
  for (let i = 0; i < waves * 2; i++) {
    const sign = i % 2 === 0 ? -1 : 1;
    d += `Q${f(x0 + seg * i + seg / 2)} ${f(y + sign * amp * 2)} ${f(x0 + seg * (i + 1))} ${f(y)}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${sw}" stroke-linecap="${cap}" fill="none"/>`;
}

function masked(maskShape, content, mid) {
  const def = `<mask id="${mid}" style="mask-type:alpha" maskUnits="userSpaceOnUse">${maskShape}</mask>\n`;
  return { def, html: `<g mask="url(#${mid})">\n${content}\n</g>` };
}

function bg(c) {
  return `<rect width="500" height="500" fill="${c}"/>`;
}


// 24 Unique, Soft & Vibrant Palettes
const PALETTES = [
  { name: 'soft_sage', bg: '#E8EFE9', body: '#94B49F', pattern: '#789582', head: '#CEE5D0', accent: '#8EAF9D', dark: '#2C3531', cheek: '#E09F97' },
  { name: 'peach_cream', bg: '#FFF5E4', body: '#FFC4C4', pattern: '#EE6969', head: '#FFE3E3', accent: '#FF9494', dark: '#4A3E3D', cheek: '#FF8787' },
  { name: 'nordic_ice', bg: '#EBF4F6', body: '#071952', pattern: '#088395', head: '#37B7C3', accent: '#64CCC5', dark: '#071952', cheek: '#FF9EAA' },
  { name: 'matcha_berry', bg: '#F0F5ED', body: '#557C55', pattern: '#A6CF98', head: '#FA7070', accent: '#F2D388', dark: '#2D3B2D', cheek: '#FF8A8A' },
  { name: 'cotton_candy', bg: '#F7EFE5', body: '#C3ACD0', pattern: '#776B5D', head: '#FBE4E8', accent: '#F31559', dark: '#363062', cheek: '#FF90BB' },
  { name: 'warm_terracotta', bg: '#FDF7F4', body: '#8D493A', pattern: '#D7907B', head: '#E0A96D', accent: '#EEC78C', dark: '#3C2A21', cheek: '#E17564' },
  { name: 'dusk_violet', bg: '#F3F0D7', body: '#5C5470', pattern: '#352F44', head: '#DBD8E3', accent: '#B8B5C6', dark: '#2A2438', cheek: '#E09F97' },
  { name: 'bubblegum_pop', bg: '#FCE7F3', body: '#EC4899', pattern: '#F472B6', head: '#FDE047', accent: '#38BDF8', dark: '#1E1B4B', cheek: '#F43F5E' },
  { name: 'cloud_pastel', bg: '#F0F9FF', body: '#BAE6FD', pattern: '#7DD3FC', head: '#FBCFE8', accent: '#FDE68A', dark: '#0F172A', cheek: '#F472B6' },
  { name: 'lavender_mist', bg: '#FAF5FF', body: '#C084FC', pattern: '#E879F9', head: '#818CF8', accent: '#A5F3FC', dark: '#312E81', cheek: '#F43F5E' },
  { name: 'minty_breeze', bg: '#ECFDF5', body: '#34D399', pattern: '#059669', head: '#FDE68A', accent: '#6EE7B7', dark: '#064E3B', cheek: '#F87171' },
  { name: 'sunset_glow', bg: '#FFF7ED', body: '#FB923C', pattern: '#EA580C', head: '#F43F5E', accent: '#FDE047', dark: '#431407', cheek: '#F43F5E' },
  { name: 'sunny', bg: '#F4C7A6', body: '#FF6F3C', pattern: '#1B1B1B', head: '#FFC93C', accent: '#FF9F1C', dark: '#111111', cheek: '#FF6B6B' },
  { name: 'bloomy', bg: '#BFD8C2', body: '#2E8B57', pattern: '#1F5F3A', head: '#FF5DA2', accent: '#FF8DBF', dark: '#111111', cheek: '#FF4E4E' },
  { name: 'blocky', bg: '#FFD9E8', body: '#7C4DFF', pattern: '#B9A2FF', head: '#00B8A9', accent: '#33D1C4', dark: '#111111', cheek: '#FF6B6B' },
  { name: 'cometa', bg: '#FFE8A3', body: '#7CF7B0', pattern: '#111111', head: '#7A5CFF', accent: '#3B2BC4', dark: '#111111', cheek: '#FF6B6B' },
  { name: 'globby', bg: '#C6B6F2', body: '#FFE94A', pattern: '#FF4E4E', head: '#FF7A3D', accent: '#FF9E6D', dark: '#111111', cheek: '#FF4E4E' },
  { name: 'ziggy', bg: '#A8E6CF', body: '#FFF3B0', pattern: '#FF3D71', head: '#FF3D71', accent: '#111111', dark: '#111111', cheek: '#FF8FAE' },
  { name: 'moony', bg: '#1F2A6B', body: '#F6E27F', pattern: '#1F2A6B', head: '#F6E27F', accent: '#E3CB5C', dark: '#111111', cheek: '#FF4E4E' },
  { name: 'tulipa', bg: '#FFF0C9', body: '#3BB273', pattern: '#2A8D57', head: '#FF4F5E', accent: '#D93A49', dark: '#111111', cheek: '#FF8FAE' },
  { name: 'stacko', bg: '#FFB8A1', body: '#2F6BFF', pattern: '#9DBBFF', head: '#FFD23F', accent: '#7CE0D3', dark: '#111111', cheek: '#FF5DA2' },
  { name: 'hearty', bg: '#D6F0FF', body: '#8FD3FF', pattern: '#D6F0FF', head: '#FF3D6E', accent: '#FF8FAE', dark: '#111111', cheek: '#FF3D6E' },
  { name: 'cyber', bg: '#120E24', body: '#00F5D4', pattern: '#7B2CBF', head: '#F72585', accent: '#4CC9F0', dark: '#0D0B18', cheek: '#FF007F' },
  { name: 'lunar_slate', bg: '#F1F5F9', body: '#475569', pattern: '#334155', head: '#94A3B8', accent: '#CBD5E1', dark: '#0F172A', cheek: '#F43F5E' }
];

// Body Silhouettes - Top Quality Torso Curves
const BODY_MASKS = {
  hill: '<path d="M-120 500 C-60 330 140 300 250 300 C360 300 560 330 620 500 V700 H-120Z" fill="white"/>',
  dome: '<circle cx="250" cy="760" r="420" fill="white"/>',
  skirt: '<path d="M372 690H128L40 330H460L372 690Z" fill="white"/>',
  cloud: '<path d="M-40 540 V430 C-40 385 0 360 45 368 C55 322 120 300 165 325 C195 285 275 285 305 325 C350 300 415 322 425 368 C470 360 540 385 540 430 V540Z" fill="white"/>',
  block: '<path d="M40 500 V430 C40 372 88 330 148 330 H352 C412 330 460 372 460 430 V500Z" fill="white"/>',
  leaf: '<path d="M-40 520 C-20 400 120 350 250 350 C380 350 520 400 540 520Z" fill="white"/>',
  oval_shoulders: '<ellipse cx="250" cy="500" rx="210" ry="180" fill="white"/>',
  arch_body: '<path d="M120 500 V400 C120 310 380 310 380 400 V500Z" fill="white"/>',
  trapezoid_pill: '<path d="M110 500 L160 350 Q250 330 340 350 L390 500Z" fill="white"/>',
  scalloped_collar: '<path d="M60 500 V420 C60 350 140 330 250 330 C360 330 440 350 440 420 V500Z" fill="white"/>'
};

// Body Pattern Generators - 100% full coverage across canvas viewport
function generateBodyPattern(type, palette, rnd) {
  let content = `<rect x="-50" y="230" width="600" height="300" fill="${palette.body}"/>`;
  
  if (type === 'triangles') {
    const step = 62;
    for (let r = -1; r < 6; r++) {
      for (let c = -2; c < 10; c++) {
        const x = c * step + (r % 2 ? Math.floor(step / 2) : 0);
        const y = 250 + r * step;
        content += `<path d="M${x} ${y}L${x + step} ${y}L${x + Math.floor(step / 2)} ${y + step}Z" fill="${palette.pattern}"/>`;
      }
    }
  } else if (type === 'stripes') {
    for (let i = -10; i < 25; i++) {
      content += `<rect x="${i * 35}" y="200" width="18" height="500" fill="${palette.pattern}" transform="rotate(-18 250 400)"/>`;
    }
  } else if (type === 'checkerboard') {
    const s = 48;
    for (let r = 0; r < 7; r++) {
      for (let c = -1; c < 12; c++) {
        const col = (r + c) % 2 === 0 ? palette.body : palette.pattern;
        content += `<rect x="${c * s}" y="${240 + r * s}" width="${s}" height="${s}" fill="${col}"/>`;
      }
    }
  } else if (type === 'zigzag') {
    for (let r = 0; r < 9; r++) {
      let d = `M-40 ${255 + r * 30}`;
      for (let k = 0; k < 16; k++) {
        d += `L${-40 + k * 40 + 20} ${255 + r * 30 - 15}L${-40 + (k + 1) * 40} ${255 + r * 30}`;
      }
      const col = r % 2 === 0 ? palette.pattern : palette.dark;
      content += `<path d="${d}" stroke="${col}" stroke-width="12" fill="none"/>`;
    }
  } else if (type === 'plaid') {
    for (let i = -1; i < 9; i++) {
      content += `<rect x="${-10 + i * 64}" y="240" width="18" height="300" fill="${palette.pattern}"/>`;
    }
    for (let j = 0; j < 6; j++) {
      content += `<rect x="-10" y="${250 + j * 50}" width="520" height="16" fill="${palette.pattern}"/>`;
    }
  } else if (type === 'dots') {
    for (let r = 0; r < 7; r++) {
      for (let c = -1; c < 10; c++) {
        const x = 20 + c * 56 + (r % 2 ? 28 : 0);
        content += `<circle cx="${x}" cy="${250 + r * 42}" r="13" fill="${palette.pattern}"/>`;
      }
    }
  } else if (type === 'stars') {
    const pts = [[40, 310], [120, 280], [200, 320], [280, 275], [360, 325], [440, 280], [80, 380], [160, 420], [240, 370], [320, 430], [400, 380], [480, 420], [100, 480], [250, 490], [400, 485]];
    for (const [x, y] of pts) {
      content += `<path d="${starPath(x, y, 16, 6, 4, 0, 1.5)}" fill="${palette.pattern}"/>`;
    }
  } else if (type === 'waves') {
    for (let r = 0; r < 8; r++) {
      content += wave(-20, 250 + r * 35, 520, 10, 4, 12, palette.pattern, "round");
    }
  } else if (type === 'scallop') {
    for (let r = 0; r < 7; r++) {
      for (let c = -2; c < 10; c++) {
        const x = c * 60 + (r % 2 ? 30 : 0);
        const y = 250 + r * 38;
        content += `<path d="M${x} ${y} A30 30 0 0 0 ${x + 60} ${y} Z" fill="${palette.pattern}"/>`;
      }
    }
  } else if (type === 'confetti') {
    for (let r = 0; r < 6; r++) {
      for (let c = -1; c < 10; c++) {
        const x = c * 52 + (r % 2 ? 26 : 0);
        const y = 260 + r * 42;
        const rot = (r * 30 + c * 45) % 90;
        content += `<rect x="${x}" y="${y}" width="16" height="8" rx="4" fill="${palette.pattern}" transform="rotate(${rot} ${x} ${y})"/>`;
      }
    }
  }
  
  return content;
}

// Head Generators - Radially Angled & Tucked Base Geometry
function generateHead(type, palette, rnd) {
  let back = '', main = '', front = '';

  if (type === 'sunny') {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = i * 360 / n;
      back += `<rect x="228" y="18" width="44" height="86" rx="22" fill="${palette.accent}" transform="rotate(${a} 250 205)"/>`;
    }
    main = `<circle cx="250" cy="205" r="122" fill="${palette.head}"/>`;
  } else if (type === 'bloomy') {
    for (const p of flowerPetals(250, 205, 92, 62, 7, 10)) {
      back += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${p.r}" fill="${palette.head}"/>`;
    }
    main = `<circle cx="250" cy="205" r="82" fill="${palette.head}"/>`;
  } else if (type === 'blocky') {
    main = `<rect x="120" y="60" width="260" height="290" rx="130" fill="${palette.head}"/>`;
  } else if (type === 'cometa') {
    const rot = "rotate(-16 250 190)";
    back = `<path d="M55 190 A195 92 0 0 1 445 190" transform="${rot}" stroke="${palette.accent}" stroke-width="40" fill="none"/>`;
    main = `<ellipse cx="250" cy="190" rx="150" ry="74" transform="${rot}" fill="${palette.head}"/>`;
    front = `<path d="M55 190 A195 92 0 0 0 445 190" transform="${rot}" stroke="${palette.accent}" stroke-width="40" fill="none"/>`;
  } else if (type === 'globby') {
    const d = blobPath(250, 195, 128, 9, 0.16, rnd, 8);
    main = `<path d="${d}" fill="${palette.head}"/>`;
  } else if (type === 'ziggy') {
    back = `<path d="M165 140 L175 55 L212 110 L250 40 L288 110 L325 55 L335 140 Z" fill="${palette.dark}" stroke="${palette.dark}" stroke-width="12" stroke-linejoin="round"/>`;
    main = `<rect x="132" y="70" width="236" height="290" rx="118" fill="${palette.head}"/>`;
  } else if (type === 'moony') {
    main = `<circle cx="250" cy="205" r="122" fill="${palette.head}"/>` +
           `<path d="M250 83 A122 122 0 0 0 128 205 A122 122 0 0 0 250 327 A98 98 0 0 1 250 83 Z" fill="${palette.accent}"/>` +
           `<circle cx="160" cy="265" r="14" fill="${palette.accent}" opacity="0.6"/>` +
           `<circle cx="195" cy="305" r="9" fill="${palette.accent}" opacity="0.6"/>`;
  } else if (type === 'tulipa') {
    main = `<path d="M140 100 C140 40 195 40 215 95 C230 55 270 55 285 95 C305 40 360 40 360 100 C375 220 340 330 250 340 C160 330 125 220 140 100Z" fill="${palette.head}"/>`;
  } else if (type === 'stacko') {
    main = `<rect x="110" y="235" width="280" height="130" rx="65" fill="${palette.head}"/>` +
           `<rect x="130" y="135" width="240" height="130" rx="65" fill="${palette.accent}"/>` +
           `<rect x="155" y="35" width="190" height="130" rx="65" fill="${palette.body}"/>`;
  } else if (type === 'hearty') {
    main = `<path d="M250 345 C110 255 70 175 90 118 C110 58 200 48 250 122 C300 48 390 58 410 118 C430 175 390 255 250 345Z" fill="${palette.head}"/>` +
           `<path d="M120 112 C130 88 158 82 178 96" stroke="${palette.accent}" stroke-width="14" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'cloudy') {
    main = `<path d="M140 190 C120 145 160 105 210 115 C230 85 270 85 290 115 C330 95 370 135 360 180 C390 220 350 275 300 275 H170 C120 275 100 225 140 190Z" fill="${palette.head}"/>`;
  } else if (type === 'droplet') {
    main = `<path d="M250 70 C330 70 370 155 370 220 C370 295 316 335 250 335 C184 335 130 295 130 220 C130 155 170 70 250 70Z" fill="${palette.head}"/>`;
  } else if (type === 'starhead') {
    main = `<path d="${starPath(250, 200, 145, 105, 5, 0, 18)}" fill="${palette.head}"/>`;
  } else if (type === 'gem') {
    main = `<path d="${starPath(250, 195, 135, 135, 4, 45, 25)}" fill="${palette.head}"/>`;
  } else if (type === 'bear_ears') {
    back = `<circle cx="170" cy="120" r="42" fill="${palette.head}"/><circle cx="330" cy="120" r="42" fill="${palette.head}"/><circle cx="170" cy="120" r="22" fill="${palette.accent}"/><circle cx="330" cy="120" r="22" fill="${palette.accent}"/>`;
    main = `<circle cx="250" cy="215" r="115" fill="${palette.head}"/>`;
  } else if (type === 'bunny_ears') {
    back = `<g transform="rotate(-12 250 215)"><path d="M185 150 C170 25 210 15 225 150 Z" fill="${palette.head}"/><path d="M192 145 C182 45 205 35 215 145 Z" fill="${palette.accent}"/></g>` +
           `<g transform="rotate(12 250 215)"><path d="M315 150 C330 25 290 15 275 150 Z" fill="${palette.head}"/><path d="M308 145 C318 45 295 35 285 145 Z" fill="${palette.accent}"/></g>`;
    main = `<circle cx="250" cy="215" r="115" fill="${palette.head}"/>`;
  } else if (type === 'cat_ears') {
    back = `<g transform="rotate(-25 250 215)"><path d="M160 140 L185 45 L225 125 Z" fill="${palette.head}"/><path d="M170 135 L187 60 L215 125 Z" fill="${palette.accent}"/></g>` +
           `<g transform="rotate(25 250 215)"><path d="M340 140 L315 45 L275 125 Z" fill="${palette.head}"/><path d="M330 135 L313 60 L285 125 Z" fill="${palette.accent}"/></g>`;
    main = `<circle cx="250" cy="215" r="115" fill="${palette.head}"/>`;
  } else if (type === 'mushroom') {
    back = `<path d="M120 195 C120 75 380 75 380 195 Z" fill="${palette.accent}"/>` +
           `<circle cx="200" cy="120" r="14" fill="white" opacity="0.8"/>` +
           `<circle cx="300" cy="110" r="18" fill="white" opacity="0.8"/>` +
           `<circle cx="250" cy="150" r="10" fill="white" opacity="0.8"/>`;
    main = `<rect x="145" y="140" width="210" height="180" rx="90" fill="${palette.head}"/>`;
  } else if (type === 'egg_arch') {
    main = `<path d="M140 210 C140 95 360 95 360 210 C360 295 310 330 250 330 C190 330 140 295 140 210Z" fill="${palette.head}"/>`;
  }

  return { back, main, front };
}

// Eye Expression Generators - Proportionately scaled to sit comfortably inside any face contour
function generateEyes(type, palette, rnd) {
  let content = '';

  if (type === 'symmetric') {
    content = `<ellipse cx="205" cy="205" rx="36" ry="44" fill="white"/>` +
              `<circle cx="214" cy="214" r="20" fill="${palette.dark}"/>` +
              `<circle cx="295" cy="188" r="22" fill="white"/>` +
              `<circle cx="298" cy="192" r="11" fill="${palette.dark}"/>`;
  } else if (type === 'cyclops') {
    content = `<circle cx="250" cy="205" r="52" fill="white"/>` +
              `<rect x="228" y="188" width="44" height="52" rx="22" fill="${palette.dark}"/>`;
  } else if (type === 'mismatched') {
    content = `<circle cx="205" cy="175" r="36" fill="white"/><circle cx="214" cy="183" r="17" fill="${palette.dark}"/>` +
              `<circle cx="295" cy="158" r="22" fill="white"/><circle cx="298" cy="161" r="10" fill="${palette.dark}"/>`;
  } else if (type === 'almonds') {
    content = `<path d="${almond(202, 205, 80, 48)}" fill="white"/><circle cx="210" cy="208" r="19" fill="${palette.dark}"/>` +
              `<path d="${almond(298, 205, 80, 48)}" fill="white"/><circle cx="306" cy="208" r="19" fill="${palette.dark}"/>`;
  } else if (type === 'wink') {
    content = `<ellipse cx="208" cy="192" rx="38" ry="46" fill="white"/><circle cx="218" cy="200" r="19" fill="${palette.dark}"/>` +
              `<path d="${almond(298, 200, 60, 26)}" fill="white"/><rect x="288" y="193" width="22" height="14" rx="7" fill="${palette.dark}"/>`;
  } else if (type === 'sparkle') {
    content = `<circle cx="196" cy="188" r="38" fill="white"/>` +
              `<path d="${starPath(199, 191, 24, 7, 4, 0, 1)}" fill="${palette.dark}"/>` +
              `<circle cx="300" cy="176" r="28" fill="white"/><circle cx="305" cy="181" r="13" fill="${palette.dark}"/>`;
  } else if (type === 'three_eyes') {
    content = `<circle cx="205" cy="172" r="34" fill="white"/><circle cx="214" cy="180" r="16" fill="${palette.dark}"/>` +
              `<circle cx="295" cy="155" r="20" fill="white"/><circle cx="298" cy="158" r="9" fill="${palette.dark}"/>` +
              `<circle cx="285" cy="222" r="14" fill="white"/><circle cx="287" cy="224" r="6" fill="${palette.dark}"/>`;
  } else if (type === 'happy_arcs') {
    content = `<path d="M185 190 Q205 165 225 190" stroke="${palette.dark}" stroke-width="12" stroke-linecap="round" fill="none"/>` +
              `<path d="M275 190 Q295 165 315 190" stroke="${palette.dark}" stroke-width="12" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'cool_glasses') {
    // Scaled glasses (width=65 each) sitting comfortably inside face with temple lines inside skull bounds
    content = `<rect x="175" y="168" width="65" height="50" rx="16" fill="${palette.dark}"/>` +
              `<rect x="260" y="168" width="65" height="50" rx="16" fill="${palette.dark}"/>` +
              `<rect x="240" y="186" width="20" height="10" fill="${palette.dark}"/>` +
              `<line x1="150" y1="184" x2="175" y2="184" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round"/>` +
              `<line x1="325" y1="184" x2="350" y2="184" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (type === 'sleepy') {
    content = `<path d="${almond(202, 195, 76, 36)}" fill="white"/><circle cx="202" cy="195" r="15" fill="${palette.dark}"/>` +
              `<path d="${almond(298, 195, 76, 36)}" fill="white"/><circle cx="298" cy="195" r="15" fill="${palette.dark}"/>`;
  } else if (type === 'anime_glimmer') {
    content = `<ellipse cx="202" cy="195" rx="38" ry="44" fill="white"/>` +
              `<ellipse cx="204" cy="197" rx="23" ry="27" fill="${palette.dark}"/>` +
              `<circle cx="195" cy="184" r="9" fill="white"/>` +
              `<circle cx="212" cy="205" r="5" fill="white"/>` +
              `<ellipse cx="298" cy="195" rx="38" ry="44" fill="white"/>` +
              `<ellipse cx="296" cy="197" rx="23" ry="27" fill="${palette.dark}"/>` +
              `<circle cx="287" cy="184" r="9" fill="white"/>` +
              `<circle cx="304" cy="205" r="5" fill="white"/>`;
  } else if (type === 'retro_visor') {
    // Compact visor (width=150 spanning x=175..325) sitting comfortably inside any head shape
    content = `<rect x="175" y="170" width="150" height="48" rx="16" fill="${palette.dark}"/>` +
              `<path d="M190 178 L270 178" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.75"/>`;
  }

  return content;
}

// Mouth Expression Generators
function generateMouth(type, palette, rnd) {
  if (type === 'wave') {
    return wave(195, 265, 305, 8, 2, 12, palette.dark, "round");
  } else if (type === 'smile') {
    return `<path d="M215 282 Q250 312 285 282" stroke="${palette.dark}" stroke-width="11" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'rect_tooth') {
    return `<rect x="210" y="278" width="80" height="26" rx="13" fill="${palette.dark}"/>` +
           `<rect x="228" y="278" width="18" height="12" rx="3" fill="white"/>`;
  } else if (type === 'pill_open') {
    return `<rect x="180" y="282" width="90" height="30" rx="15" fill="${palette.dark}"/>` +
           `<rect x="205" y="282" width="22" height="13" rx="3" fill="white"/>`;
  } else if (type === 'simple_curve') {
    return `<path d="M205 292 Q225 310 245 292" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'cat_smile') {
    return `<path d="M218 278 Q234 292 250 278 Q266 292 282 278" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'o_mouth') {
    return `<circle cx="250" cy="282" r="14" fill="${palette.dark}"/>`;
  } else if (type === 'tongue_out') {
    return `<path d="M210 275 Q250 310 290 275" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" fill="none"/>` +
           `<path d="M228 284 Q250 320 272 284 Z" fill="${palette.cheek}"/>`;
  } else if (type === 'smirk') {
    return `<path d="M215 286 Q250 294 280 268" stroke="${palette.dark}" stroke-width="11" stroke-linecap="round" fill="none"/>`;
  }
  return '';
}

// Guaranteed non-overlapping, crisp background sparkles
function generateBackgroundDecorations(palette, rnd) {
  const safePositions = [
    [55, 55, 10],   // Top-Left Corner
    [445, 55, 10],  // Top-Right Corner
    [50, 160, 8],   // Upper-Left Side
    [450, 160, 8],  // Upper-Right Side
    [250, 42, 11],  // Top Center
    [75, 270, 7],   // Mid-Left Outer
    [425, 270, 7],  // Mid-Right Outer
    [95, 95, 6],    // Inner Top-Left
    [405, 95, 6]    // Inner Top-Right
  ];
  
  const pool = [...safePositions];
  const count = rnd.int(2, 4);
  const selected = [];
  
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = rnd.int(0, pool.length - 1);
    const [x, y, r] = pool.splice(idx, 1)[0];
    const rot = rnd.int(0, 45);
    selected.push(`<path d="${starPath(x, y, r, r * 0.3, 4, rot, 1)}" fill="${palette.accent || palette.dark}"/>`);
  }
  
  return selected.join('');
}

function svg(inner, defs = "", cid = "clip_default", seed = "", shape = "circle") {
  const cleanSeed = String(seed).trim();
  const descTag = `<desc>This avatar is unique and created specifically for @${cleanSeed}.</desc>\n`;

  let clipShapeHtml = `<circle cx="250" cy="250" r="250"/>`;
  if (shape === 'square') {
    clipShapeHtml = `<rect width="500" height="500"/>`;
  } else if (shape === 'squircle') {
    clipShapeHtml = `<path d="M 110 0 L 390 0 C 455 0 500 45 500 110 L 500 390 C 500 455 455 500 390 500 L 110 500 C 45 500 0 455 0 390 L 0 110 C 0 45 45 0 110 0 Z"/>`;
  }

  return `<svg width="500" height="500" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">\n` +
         descTag +
         `<g clip-path="url(#${cid})">\n${inner}\n</g>\n` +
         `<defs>\n<clipPath id="${cid}">${clipShapeHtml}</clipPath>\n${defs}</defs>\n` +
         `</svg>\n`;
}

/**
 * Main Avatar Generator Function
 * @param {string|number} seed - Unique seed value
 * @param {string} shape - 'circle' | 'squircle' | 'square'
 * @returns {string} SVG string
 */
function generateAvatar(seed = 'avatar', shape = 'circle') {
  const rnd = createRnd(seed);
  
  // Pick composition properties deterministically
  const palette = rnd.pick(PALETTES);
  const bodyShapeKey = rnd.pick(Object.keys(BODY_MASKS));
  const bodyPatternKey = rnd.pick(['triangles', 'stripes', 'checkerboard', 'zigzag', 'plaid', 'dots', 'stars', 'waves', 'scallop', 'confetti']);
  const headType = rnd.pick(['sunny', 'bloomy', 'blocky', 'cometa', 'globby', 'ziggy', 'moony', 'tulipa', 'stacko', 'hearty', 'cloudy', 'droplet', 'starhead', 'gem', 'bear_ears', 'bunny_ears', 'cat_ears', 'mushroom', 'egg_arch']);
  const eyeType = rnd.pick(['symmetric', 'cyclops', 'mismatched', 'almonds', 'wink', 'sparkle', 'three_eyes', 'happy_arcs', 'cool_glasses', 'sleepy', 'anime_glimmer', 'retro_visor']);
  const mouthType = rnd.pick(['wave', 'smile', 'rect_tooth', 'pill_open', 'simple_curve', 'cat_smile', 'o_mouth', 'tongue_out', 'smirk']);
  const hasCheek = rnd() > 0.4;
  
  // Deterministic unique IDs for SVG masks & clips (append shape to prevent DOM collisions for same seed)
  const clipId = nid('clip', rnd) + '_' + shape;
  const maskId = nid('mask', rnd) + '_' + shape;
  
  // Layer order: Background -> Sparkles -> HeadBack -> BodyTorso -> HeadMain -> Cheeks -> Eyes -> Mouth -> HeadFront
  const backgroundLayer = bg(palette.bg);
  const bgDecorations = generateBackgroundDecorations(palette, rnd);
  
  // Head parts
  const { back: headBack, main: headMain, front: headFront } = generateHead(headType, palette, rnd);
  
  // Masked Body
  const bodyMaskPath = BODY_MASKS[bodyShapeKey];
  const bodyPatternContent = generateBodyPattern(bodyPatternKey, palette, rnd);
  const { def: maskDef, html: bodyHtml } = masked(bodyMaskPath, bodyPatternContent, maskId);
  
  // Facial features
  const cheekHtml = hasCheek ? `<circle cx="165" cy="240" r="16" fill="${palette.cheek}"/>` : '';
  const eyesHtml = generateEyes(eyeType, palette, rnd);
  const mouthHtml = generateMouth(mouthType, palette, rnd);
  
  // Assemble final SVG
  const innerHtml = backgroundLayer + '\n' +
                    bgDecorations + '\n' +
                    headBack + '\n' +
                    bodyHtml + '\n' +
                    headMain + '\n' +
                    cheekHtml + '\n' +
                    eyesHtml + '\n' +
                    mouthHtml + '\n' +
                    headFront;
  
  return svg(innerHtml, maskDef, clipId, seed, shape);
}

// Export for ES Module, CommonJS, and Browser global
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { generateAvatar, PALETTES };
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return { generateAvatar, PALETTES }; });
} else {
  if (typeof window !== 'undefined') {
    window.generateAvatar = generateAvatar;
    window.AVATAR_PALETTES = PALETTES;
  }
}
