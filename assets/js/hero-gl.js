/* BaHaar's Styling Studio – Liquid-Glass-Hero (WebGL2)
   Ein echtes Haar-Ergebnis aus dem Studio löst sich ohne Rahmen in einen türkisen
   Perlmutt-Raum auf, eine Orchideenblüte setzt den Akzent. Flüssige Glastropfen
   brechen das Bild, verschmelzen miteinander und folgen dem Zeiger.
   Ohne WebGL2 bleibt die identisch komponierte HTML/CSS-Ebene sichtbar. */
(() => {
  'use strict';

  const hero = document.querySelector('[data-hero]');
  const stage = hero?.querySelector('[data-hero-stage]');
  const canvas = hero?.querySelector('[data-hero-gl]');
  if (!hero || !stage || !canvas) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) { hero.classList.add('hero--static'); return; }

  /* ---------------------------------------------------------------- */
  const VERT = `#version 300 es
  void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  uniform vec2 uRes;
  uniform float uDpr;
  uniform float uTime;
  uniform vec4 uRect[3];
  uniform vec4 uParam[3];
  uniform vec2 uShift[3];
  uniform vec2 uPad[3];
  uniform vec4 uShape[3];   // Typ (0 Freisteller, 1 Bogen, 2 Rechteck); Freisteller: y = Schattenstärke; Rahmen: Radius oben/unten, Rahmenbreite
  uniform vec4 uCover[3];   // Bild-Seitenverhältnis, object-position x/y
  uniform sampler2D uTex0;
  uniform sampler2D uTex1;
  uniform sampler2D uTex2;
  uniform vec4 uDrop[8];
  uniform int uDropN;
  uniform float uRibbon;
  out vec4 outColor;

  float blob(vec2 a, vec2 c, float r) { vec2 d = a - c; return exp(-dot(d, d) / (r * r)); }

  vec3 aurora(vec2 p) {
    float asp = uRes.x / uRes.y;
    vec2 a = p / uRes.y;
    float t = uTime;
    vec3 col = mix(vec3(0.949, 0.984, 0.980), vec3(0.902, 0.965, 0.953), clamp(a.y, 0.0, 1.0));
    col = mix(col, vec3(0.640, 0.890, 0.862), 0.72 * blob(a, vec2(asp * (0.76 + 0.04 * sin(t * 0.11)), 0.42 + 0.05 * cos(t * 0.09)), 0.6));
    col = mix(col, vec3(0.975, 0.890, 0.925), 0.55 * blob(a, vec2(asp * (0.06 + 0.05 * cos(t * 0.07)), 0.92 + 0.04 * sin(t * 0.10)), 0.5));
    col = mix(col, vec3(0.780, 0.930, 0.910), 0.6 * blob(a, vec2(asp * (0.30 + 0.06 * sin(t * 0.06)), 0.10), 0.48));
    col = mix(col, vec3(0.820, 0.890, 0.990), 0.55 * blob(a, vec2(asp * (0.62 + 0.05 * cos(t * 0.08)), 0.98), 0.42));
    return col;
  }

  // irisierendes Glasband (Inspiration: flüssiges Pastell-Glas)
  vec4 ribbon(vec2 p, float yOff, float amp, float width, float ph, float t) {
    vec2 a = p / uRes.y;
    float x = a.x;
    float yc = yOff + amp * sin(x * 1.6 + t * 0.12 + ph) + amp * 0.4 * sin(x * 3.1 - t * 0.09 + ph * 1.7);
    float tw = sin(x * 1.25 + t * 0.07 + ph);
    float w = width * (0.16 + 0.84 * abs(tw));
    float d = (a.y - yc) / w;
    float inside = 1.0 - smoothstep(0.9, 1.0, abs(d));
    if (inside <= 0.0) return vec4(0.0);
    float nz = sqrt(max(0.0, 1.0 - d * d));
    float fres = pow(1.0 - nz, 1.5);
    float side = tw < 0.0 ? -1.0 : 1.0;
    float h = d * 0.35 * side + x * 0.16 + t * 0.015 + ph;
    vec3 film = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.2, 0.4)));
    film = mix(vec3(0.78, 0.94, 0.92), film, 0.3);
    vec3 c = mix(vec3(0.95, 0.99, 0.98), film, 0.5 + 0.4 * fres);
    float hl = pow(max(0.0, 1.0 - abs(d * side + 0.45) * 2.4), 4.0);
    c += vec3(1.0) * hl * 0.5;
    float alpha = inside * (0.18 + 0.48 * fres + 0.3 * hl);
    return vec4(min(c, vec3(1.0)), clamp(alpha, 0.0, 0.8));
  }

  // Punkt p in das (gedrehte) Koordinatensystem des Sprites, Ursprung oben links, in px
  vec2 toLocal(int i, vec2 p) {
    vec4 r = uRect[i];
    vec4 q = uParam[i];
    vec2 origin = r.xy + vec2(r.z * 0.5, 0.0) + uShift[i];
    float ang = q.x + q.z * sin(uTime * 0.32 + q.w);
    float s = sin(-ang), c = cos(-ang);
    vec2 d = p - origin;
    d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    return d + vec2(r.z * 0.5, 0.0);
  }
  vec2 spriteUV(int i, vec2 p) {
    vec2 uv = toLocal(i, p) / uRect[i].zw;
    // Freisteller besitzen einen transparenten Rand, damit Unschärfe & Schatten weich auslaufen
    return (uv + uPad[i]) / (1.0 + 2.0 * uPad[i]);
  }
  float sdRBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }
  float sdFrame(vec2 p, vec2 b, float rt, float rb) { return sdRBox(p, b, p.y < 0.0 ? rt : rb); }
  float inBox(vec2 uv) { vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0)); return s.x * s.y; }

  vec3 layer(vec3 col, sampler2D tex, int i, vec2 p) {
    vec4 shp = uShape[i];
    if (shp.x > 0.5) {
      // Foto im Glasrahmen
      vec2 hs = uRect[i].zw * 0.5;
      vec2 c = toLocal(i, p) - hs;
      float rt = shp.y, rb = shp.z, fw = shp.w;
      float dSh = sdFrame(toLocal(i, p - vec2(16.0, 34.0)) - hs, hs, rt, rb);
      col *= 1.0 - 0.2 * (1.0 - smoothstep(-34.0, 52.0, dSh));
      float dOut = sdFrame(c, hs, rt, rb);
      float mOut = 1.0 - smoothstep(-0.8, 0.8, dOut);
      if (mOut <= 0.0) return col;
      vec2 hi = hs - fw;
      float dIn = sdFrame(c, hi, max(rt - fw, 0.0), max(rb - fw, 0.0));
      float mIn = 1.0 - smoothstep(-0.8, 0.8, dIn);
      // Rahmen: mattiertes Glas mit Lichtkante
      vec3 frame = mix(col, vec3(1.0), 0.6);
      float topLight = clamp(-c.y / hs.y, 0.0, 1.0);
      frame += vec3(1.0) * (1.0 - smoothstep(0.0, 2.2, -dOut)) * (0.25 + 0.35 * topLight);
      frame = mix(frame, vec3(0.62, 0.80, 0.80), 0.35 * (1.0 - smoothstep(0.0, 1.6, abs(dIn))));
      // Foto mit object-fit: cover und sanftem Atmen
      vec2 inner = hi * 2.0;
      vec2 q = (c + hi) / inner;
      q = (q - 0.5) / (1.0 + 0.03 * (0.5 + 0.5 * sin(uTime * 0.12 + uParam[i].w))) + 0.5;
      float ta = uCover[i].x, ba = inner.x / inner.y;
      vec2 uv;
      if (ta > ba) { float f = ba / ta; uv = vec2(uCover[i].y * (1.0 - f) + q.x * f, q.y); }
      else { float f = ta / ba; uv = vec2(q.x, uCover[i].z * (1.0 - f) + q.y * f); }
      vec3 photo = texture(tex, uv, uParam[i].y).rgb;
      photo *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 26.0, -dIn)) * 0.5; // leichte Innenvignette
      return mix(col, mix(frame, photo, mIn), mOut);
    }
    vec2 uv = spriteUV(i, p);
    vec2 suv = spriteUV(i, p - vec2(14.0, 28.0));
    float sh = texture(tex, suv, min(3.4 + uParam[i].y * 0.5, 4.4)).a * inBox(suv);
    col *= 1.0 - 0.16 * sh * shp.y;
    vec4 s = texture(tex, uv, uParam[i].y) * inBox(uv);
    return s.rgb + col * (1.0 - s.a);
  }

  vec3 scene(vec2 p) {
    vec3 col = aurora(p);
    vec4 r1 = ribbon(p, 0.74, 0.07, 0.085, 0.0, uTime);
    col = mix(col, r1.rgb, r1.a * uRibbon);
    vec4 r2 = ribbon(p, 0.24, 0.05, 0.035, 2.1, uTime * 0.8);
    col = mix(col, r2.rgb, r2.a * 0.65 * uRibbon);
    col = layer(col, uTex0, 0, p);
    col = layer(col, uTex1, 1, p);
    col = layer(col, uTex2, 2, p);
    return col;
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }
  float field(vec2 p) {
    float d = 1e4;
    for (int i = 0; i < 8; i++) {
      if (i >= uDropN) break;
      vec4 dr = uDrop[i];
      if (dr.z < 1.0) continue;
      d = smin(d, length(p - dr.xy) - dr.z, 34.0);
    }
    return d;
  }

  void main() {
    vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
    float f = field(p);
    vec3 col;
    if (f < 0.0) {
      vec2 g = vec2(field(p + vec2(1.0, 0.0)) - field(p - vec2(1.0, 0.0)),
                    field(p + vec2(0.0, 1.0)) - field(p - vec2(0.0, 1.0)));
      vec2 n = g / max(length(g), 1e-4);
      float depth = clamp(-f / 40.0, 0.0, 1.0);
      float bend = pow(1.0 - depth, 2.3);
      vec2 off = -n * bend * 44.0 + n * f * 0.17;
      vec3 cr = scene(p + off * 1.16);
      vec3 cg = scene(p + off);
      vec3 cb = scene(p + off * 0.85);
      col = vec3(cr.r, cg.g, cb.b);
      col = mix(col, vec3(1.0), 0.04 + 0.12 * bend);
      vec2 L = normalize(vec2(-0.55, -0.85));
      float rim = 1.0 - smoothstep(0.0, 0.45, depth);
      float spec = pow(max(dot(n, L), 0.0), 2.5) * rim;
      float back = pow(max(dot(n, -L), 0.0), 2.0) * rim;
      vec3 irid = 0.55 + 0.45 * cos(6.28318 * (dot(n, vec2(0.6, 0.8)) * 0.35 + uTime * 0.03 + vec3(0.0, 0.33, 0.67)));
      col += vec3(1.0) * spec * 0.62;
      col += mix(vec3(1.0, 0.86, 0.98), irid, 0.6) * back * 0.34;
      col *= 1.0 - 0.10 * (1.0 - smoothstep(0.0, 2.2, -f));
      float glint = 0.0;
      for (int i = 0; i < 8; i++) {
        if (i >= uDropN) break;
        vec4 dr = uDrop[i];
        if (dr.z < 1.0) continue;
        vec2 d = p - (dr.xy + vec2(-0.38, -0.44) * dr.z);
        d = mat2(0.82, 0.57, -0.57, 0.82) * d;
        vec2 q = d / (dr.z * vec2(0.20, 0.11));
        glint += (1.0 - smoothstep(0.45, 1.0, length(q))) * 0.72;
      }
      col += vec3(glint);
    } else {
      col = scene(p);
      float fs = field(p - vec2(9.0, 22.0));
      float shadow = 1.0 - smoothstep(-14.0, 28.0, fs);
      col *= 1.0 - 0.085 * shadow;
      float caustic = exp(-pow((fs + 15.0) / 9.0, 2.0));
      col += vec3(1.0, 0.97, 1.0) * caustic * 0.11;
      col += vec3(1.0) * 0.07 * (1.0 - smoothstep(0.0, 7.0, f));
    }
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

  /* ---------------------------------------------------------------- */
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('Hero-Shader nicht verfügbar:', err);
    hero.classList.add('hero--static');
    return;
  }
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  const U = {};
  ['uRes', 'uDpr', 'uTime', 'uRect', 'uParam', 'uShift', 'uPad', 'uShape', 'uCover', 'uTex0', 'uTex1', 'uTex2', 'uDrop', 'uDropN', 'uRibbon']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  /* --------------------------- Sprites ----------------------------- */
  // Reihenfolge im DOM = Zeichenreihenfolge (hinten → vorne), max. 3 Ebenen
  const sprites = [...stage.querySelectorAll('[data-sprite]')].slice(0, 3).map((el) => ({
    el,
    img: el.tagName === 'IMG' ? el : el.querySelector('img'),
    blur: parseFloat(el.dataset.blur) || 0,
    shape: { cutout: 0, arch: 1, rect: 2 }[el.dataset.shape || 'cutout'],
    shadow: el.dataset.shadow !== undefined ? parseFloat(el.dataset.shadow) : 1,
    sway: el.dataset.sway !== undefined ? parseFloat(el.dataset.sway) : null,
    depth: el.dataset.depth !== undefined ? parseFloat(el.dataset.depth) : null,
  }));
  const anchor = sprites.find((s) => 'anchor' in s.el.dataset) || sprites[0];

  const texCache = new Map();
  const PAD = 0.2;
  const pads = new Float32Array(6);
  function textureFor(img, padded) {
    const key = (img.currentSrc || img.src) + (padded ? '#pad' : '');
    if (texCache.has(key)) return texCache.get(key);
    const w = img.naturalWidth, h = img.naturalHeight;
    let source = img;
    let pad = [0, 0];
    if (padded) {
      const p = Math.round(Math.max(w, h) * PAD);
      const cv = document.createElement('canvas');
      cv.width = w + 2 * p;
      cv.height = h + 2 * p;
      cv.getContext('2d').drawImage(img, p, p, w, h);
      source = cv;
      pad = [p / w, p / h];
    }
    const tex = gl.createTexture();
    tex.pad = pad;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texCache.set(key, tex);
    return tex;
  }

  const whenLoaded = (img) => (img.complete && img.naturalWidth
    ? (img.decode ? img.decode().catch(() => {}) : Promise.resolve())
    : new Promise((res, rej) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', rej, { once: true }); }));

  /* --------------------------- Layout ------------------------------ */
  let W = 0, H = 0, dpr = 1;
  let dprCap = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75);
  const rects = new Float32Array(12);
  const params = new Float32Array(12);
  const shapes = new Float32Array(12);
  const covers = new Float32Array(12);
  const shifts = new Float32Array(6);
  let anchorBox = { x: 0, y: 0, w: 1, h: 1 };

  const pct = (v, fallback) => (v && v.endsWith('%') ? parseFloat(v) / 100 : fallback);
  function measure() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    dpr = dprCap;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    sprites.forEach((s, i) => {
      const el = s.el;
      const cs = getComputedStyle(el);
      const rot = parseFloat(cs.rotate) || 0;
      const w = el.offsetWidth, h = el.offsetHeight;
      rects.set([el.offsetLeft, el.offsetTop, w, h], i * 4);
      const bias = s.blur > 0 ? Math.log2(1 + s.blur * dpr) : 0;
      const sway = s.sway ?? (s.shape === 0 ? 0.05 : 0.004);
      params.set([rot * Math.PI / 180, bias, sway, i * 1.7], i * 4);
      if (s.shape === 0) shapes.set([0, s.shadow, 0, 0], i * 4);
      if (s.shape > 0) {
        const frame = parseFloat(cs.paddingTop) || 0;
        const rb = parseFloat(cs.borderBottomLeftRadius) || 0;
        const rt = s.shape === 1 ? w / 2 : (parseFloat(cs.borderTopLeftRadius) || 0);
        shapes.set([s.shape, rt, rb, frame], i * 4);
        const pos = getComputedStyle(s.img).objectPosition.split(' ');
        covers.set([s.img.naturalWidth / s.img.naturalHeight, pct(pos[0], 0.5), pct(pos[1], 0.5), 0], i * 4);
      }
      if (s === anchor) anchorBox = { x: el.offsetLeft, y: el.offsetTop, w, h };
    });
  }

  /* -------------------- Glastropfen-Choreografie ------------------- */
  // Positionen relativ zum Anker-Bild (Haar liegt etwa bei x 0.25–0.75, y 0.15–0.85)
  const DROPS = [
    { fx: 0.30, fy: 0.36, r: 0.13, amp: 14, sp: 0.21, ph: 0.0 },
    { fx: 0.80, fy: 0.27, r: 0.08, amp: 12, sp: 0.17, ph: 1.3 },
    { fx: 0.62, fy: 0.70, r: 0.10, amp: 14, sp: 0.13, ph: 2.1 },
    { fx: 0.16, fy: 0.68, r: 0.06, amp: 10, sp: 0.25, ph: 3.4 },
    { fx: 0.88, fy: 0.58, r: 0.045, amp: 9, sp: 0.30, ph: 4.2 },
    { fx: 0.46, fy: 0.11, r: 0.045, amp: 9, sp: 0.33, ph: 5.0 },
    { fx: 0.06, fy: 0.30, r: 0.035, amp: 8, sp: 0.28, ph: 0.7 },
  ];
  const drops = new Float32Array(32);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, vx: 0, vy: 0, inside: false };
  const look = { x: 0, y: 0, tx: 0, ty: 0 };

  function updateDrops(t) {
    const c = anchorBox;
    const scroll = Math.min(scrollY, H);
    drops.set([pointer.x, pointer.y, pointer.r, 0], 0);
    DROPS.forEach((d, i) => {
      const x = c.x + d.fx * c.w + Math.sin(t * d.sp + d.ph) * d.amp;
      const y = c.y + d.fy * c.h + Math.cos(t * d.sp * 0.8 + d.ph) * d.amp - scroll * (0.16 + 0.05 * i);
      const r = d.r * c.w * (1 + 0.03 * Math.sin(t * 1.1 + i));
      drops.set([x, y, r, 0], (i + 1) * 4);
    });
  }

  /* --------------------------- Zeiger ------------------------------ */
  const isTouch = matchMedia('(hover: none)').matches;
  function setPointer(e, active) {
    const r = stage.getBoundingClientRect();
    pointer.tx = e.clientX - r.left;
    pointer.ty = e.clientY - r.top;
    if (!pointer.inside && active) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.inside = active;
    pointer.tr = active ? Math.max(46, anchorBox.w * (isTouch ? 0.16 : 0.12)) : 0;
    look.tx = (pointer.tx / W - 0.5);
    look.ty = (pointer.ty / H - 0.5);
  }
  if (!reduceMotion) {
    hero.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || pointer.inside) setPointer(e, true); }, { passive: true });
    hero.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') setPointer(e, true); }, { passive: true });
    const release = () => { pointer.inside = false; pointer.tr = 0; look.tx = 0; look.ty = 0; };
    hero.addEventListener('pointerleave', release);
    hero.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') release(); });
    hero.addEventListener('pointercancel', release);
  }

  /* --------------------------- Zeichnen ---------------------------- */
  let units = [];
  function draw(t) {
    updateDrops(t);
    sprites.forEach((s, i) => {
      const depth = s.depth ?? (s.shape === 0 ? 26 : 8 + i * 6);
      shifts.set([-look.x * depth, -look.y * depth * 0.6], i * 2);
    });
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uTime, t);
    gl.uniform4fv(U.uRect, rects);
    gl.uniform4fv(U.uParam, params);
    gl.uniform2fv(U.uShift, shifts);
    gl.uniform2fv(U.uPad, pads);
    gl.uniform4fv(U.uShape, shapes);
    gl.uniform4fv(U.uCover, covers);
    gl.uniform4fv(U.uDrop, drops);
    gl.uniform1i(U.uDropN, 1 + DROPS.length);
    gl.uniform1f(U.uRibbon, 1);
    units.forEach((tex, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    });
    gl.uniform1i(U.uTex0, 0);
    gl.uniform1i(U.uTex1, 1);
    gl.uniform1i(U.uTex2, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let running = false;
  let visible = true;
  let raf = 0;
  const t0 = performance.now();
  let frames = 0, slowFrames = 0, lastNow = 0;

  function frame(now) {
    raf = 0;
    if (!running) return;
    const t = (now - t0) / 1000;
    // Feder-Dämpfung für den Zeiger-Tropfen
    pointer.vx = (pointer.vx + (pointer.tx - pointer.x) * 0.09) * 0.72;
    pointer.vy = (pointer.vy + (pointer.ty - pointer.y) * 0.09) * 0.72;
    pointer.x += pointer.vx;
    pointer.y += pointer.vy;
    pointer.r += (pointer.tr - pointer.r) * 0.08;
    look.x += (look.tx - look.x) * 0.05;
    look.y += (look.ty - look.y) * 0.05;
    draw(t);

    // adaptive Auflösung, falls das Gerät ins Schwitzen kommt
    if (lastNow) {
      const dt = now - lastNow;
      frames++;
      if (dt > 24) slowFrames++;
      if (frames >= 45) {
        if (slowFrames > 18 && dprCap > 1) { dprCap = Math.max(1, dprCap - 0.25); measure(); }
        frames = 0; slowFrames = 0;
      }
    }
    lastNow = now;
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastNow = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* --------------------------- Start ------------------------------- */
  Promise.all(sprites.map((s) => whenLoaded(s.img))).then(() => {
    units = sprites.map((s) => textureFor(s.img, s.shape === 0));
    units.forEach((tex, i) => pads.set(tex.pad, i * 2));
    measure();
    draw(reduceMotion ? 12 : 0);
    requestAnimationFrame(() => {
      hero.classList.add('is-gl');
      setTimeout(() => hero.classList.add('is-gl-done'), 1500);
    });
    new ResizeObserver(() => { measure(); if (!running) draw(reduceMotion ? 12 : (performance.now() - t0) / 1000); }).observe(stage);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible) start(); });
    start();
  }).catch((err) => {
    console.warn('Hero-Texturen konnten nicht geladen werden:', err);
    hero.classList.add('hero--static');
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    hero.classList.remove('is-gl', 'is-gl-done');
    hero.classList.add('hero--static');
  });
})();
