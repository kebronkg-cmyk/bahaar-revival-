/* BaHaar's Styling Studio – Liquid-Glass-Hero (WebGL2)
   Ein Busch echter Orchideen, aus dessen Mitte die Schere herausschaut, steht in
   einem lila Perlmutt-Raum. Flüssige Glastropfen brechen das Bild, verschmelzen
   miteinander und folgen dem Zeiger. Beim Scrollen öffnet sich der Busch und die
   Schere tritt nach vorn.
   Ohne WebGL2 bleibt die identisch komponierte HTML/CSS-Ebene sichtbar. */
(() => {
  'use strict';

  const hero = document.querySelector('[data-hero]');
  const stage = hero?.querySelector('[data-hero-stage]');
  const canvas = hero?.querySelector('[data-hero-gl]');
  if (!hero || !stage || !canvas) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Der Glas-Shader läuft nur am Rechner mit Maus und breitem Fenster. Handy und
  // Tablet behalten die ruhige HTML/CSS-Fassung: schont Akku und bleibt gestochen scharf.
  const desktop = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  if (!desktop.matches) { hero.classList.add('hero--static'); return; }
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) { hero.classList.add('hero--static'); return; }

  const MAX = 6;

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
  uniform int uCount;
  uniform vec4 uRect[6];    // x, y, Breite, Höhe (px)
  uniform vec4 uParam[6];   // Drehung, Unschärfe, Schwingen, Phase
  uniform vec2 uShift[6];   // Verschiebung durch Zeiger
  uniform vec2 uPad[6];     // transparenter Rand der Textur
  uniform vec4 uFx[6];      // Schattenstärke, gespiegelt, Grund-Mipstufe
  uniform sampler2D uTex0;
  uniform sampler2D uTex1;
  uniform sampler2D uTex2;
  uniform sampler2D uTex3;
  uniform sampler2D uTex4;
  uniform sampler2D uTex5;
  uniform vec4 uDrop[8];
  uniform int uDropN;
  out vec4 outColor;

  float blob(vec2 a, vec2 c, float r) { vec2 d = a - c; return exp(-dot(d, d) / (r * r)); }

  vec3 aurora(vec2 p) {
    float asp = uRes.x / uRes.y;
    vec2 a = p / uRes.y;
    float t = uTime;
    vec3 col = mix(vec3(0.953, 0.937, 1.0), vec3(0.918, 0.894, 1.0), clamp(a.y, 0.0, 1.0));
    col = mix(col, vec3(0.775, 0.810, 1.0), 0.75 * blob(a, vec2(asp * (0.76 + 0.04 * sin(t * 0.11)), 0.42 + 0.05 * cos(t * 0.09)), 0.6));
    col = mix(col, vec3(0.976, 0.830, 0.930), 0.6 * blob(a, vec2(asp * (0.06 + 0.05 * cos(t * 0.07)), 0.92 + 0.04 * sin(t * 0.10)), 0.5));
    col = mix(col, vec3(0.870, 0.810, 1.0), 0.6 * blob(a, vec2(asp * (0.30 + 0.06 * sin(t * 0.06)), 0.10), 0.48));
    col = mix(col, vec3(0.830, 0.915, 1.0), 0.5 * blob(a, vec2(asp * (0.62 + 0.05 * cos(t * 0.08)), 0.98), 0.42));
    return col;
  }

  // irisierendes Glasband (flüssiges Pastellglas)
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
    film = mix(vec3(0.86, 0.82, 1.0), film, 0.34);
    vec3 c = mix(vec3(0.96, 0.95, 1.0), film, 0.5 + 0.4 * fres);
    float hl = pow(max(0.0, 1.0 - abs(d * side + 0.45) * 2.4), 4.0);
    c += vec3(1.0) * hl * 0.5;
    float alpha = inside * (0.18 + 0.48 * fres + 0.3 * hl);
    return vec4(min(c, vec3(1.0)), clamp(alpha, 0.0, 0.8));
  }

  // Punkt p in Texturkoordinaten des (gedrehten, ggf. gespiegelten) Freistellers
  vec2 spriteUV(int i, vec2 p) {
    vec4 r = uRect[i];
    vec4 q = uParam[i];
    vec2 origin = r.xy + vec2(r.z * 0.5, 0.0) + uShift[i];
    float ang = q.x + q.z * sin(uTime * 0.32 + q.w);
    float s = sin(-ang), c = cos(-ang);
    vec2 d = p - origin;
    d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    d /= 1.0 + 0.012 * sin(uTime * 0.25 + q.w * 2.0);
    vec2 uv = (d + vec2(r.z * 0.5, 0.0)) / r.zw;
    if (uFx[i].y > 0.5) uv.x = 1.0 - uv.x;
    return (uv + uPad[i]) / (1.0 + 2.0 * uPad[i]);
  }
  float inBox(vec2 uv) { vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0)); return s.x * s.y; }

  vec3 layer(vec3 col, sampler2D tex, int i, vec2 p) {
    vec2 uv = spriteUV(i, p);
    vec2 suv = spriteUV(i, p - vec2(14.0, 28.0));
    // feste Mipstufe statt Ableitungen: an den Tropfenkanten springen die
    // gebrochenen Koordinaten, Ableitungen würden dort grobe Stufen wählen
    float lod = uFx[i].z;
    float sh = textureLod(tex, suv, lod + min(3.4 + uParam[i].y * 0.5, 4.4)).a * inBox(suv);
    col *= 1.0 - 0.16 * sh * uFx[i].x;
    vec4 s = textureLod(tex, uv, lod + uParam[i].y) * inBox(uv);
    return s.rgb + col * (1.0 - s.a);
  }

  vec3 scene(vec2 p) {
    vec3 col = aurora(p);
    vec4 r1 = ribbon(p, 0.74, 0.07, 0.085, 0.0, uTime);
    col = mix(col, r1.rgb, r1.a);
    vec4 r2 = ribbon(p, 0.24, 0.05, 0.035, 2.1, uTime * 0.8);
    col = mix(col, r2.rgb, r2.a * 0.65);
    if (uCount > 0) col = layer(col, uTex0, 0, p);
    if (uCount > 1) col = layer(col, uTex1, 1, p);
    if (uCount > 2) col = layer(col, uTex2, 2, p);
    if (uCount > 3) col = layer(col, uTex3, 3, p);
    if (uCount > 4) col = layer(col, uTex4, 4, p);
    if (uCount > 5) col = layer(col, uTex5, 5, p);
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

  vec3 outside(vec2 p, float f) {
    vec3 col = scene(p);
    float fs = field(p - vec2(9.0, 22.0));
    float shadow = 1.0 - smoothstep(-14.0, 28.0, fs);
    col *= 1.0 - 0.085 * shadow;
    float caustic = exp(-pow((fs + 15.0) / 9.0, 2.0));
    col += vec3(1.0, 0.97, 1.0) * caustic * 0.11;
    col += vec3(1.0) * 0.07 * (1.0 - smoothstep(0.0, 7.0, f));
    return col;
  }

  vec3 inside(vec2 p, float f) {
    vec2 g = vec2(field(p + vec2(1.0, 0.0)) - field(p - vec2(1.0, 0.0)),
                  field(p + vec2(0.0, 1.0)) - field(p - vec2(0.0, 1.0)));
    vec2 n = g / max(length(g), 1e-4);
    float fi = min(f, 0.0);
    float depth = clamp(-fi / 40.0, 0.0, 1.0);
    float bend = pow(1.0 - depth, 2.3);
    vec2 off = -n * bend * 44.0 + n * fi * 0.17;
    vec3 cr = scene(p + off * 1.12);
    vec3 cg = scene(p + off);
    vec3 cb = scene(p + off * 0.89);
    vec3 col = vec3(cr.r, cg.g, cb.b);
    col = mix(col, vec3(0.98, 0.97, 1.0), 0.08 + 0.12 * bend);
    vec2 L = normalize(vec2(-0.55, -0.85));
    float rim = 1.0 - smoothstep(0.0, 0.45, depth);
    float spec = pow(max(dot(n, L), 0.0), 2.5) * rim;
    float back = pow(max(dot(n, -L), 0.0), 2.0) * rim;
    vec3 irid = 0.55 + 0.45 * cos(6.28318 * (dot(n, vec2(0.6, 0.8)) * 0.35 + uTime * 0.03 + vec3(0.0, 0.33, 0.67)));
    col += vec3(1.0) * spec * 0.62;
    col += mix(vec3(1.0, 0.86, 0.98), irid, 0.6) * back * 0.34;
    col *= 1.0 - 0.06 * (1.0 - smoothstep(0.0, 3.0, -fi));
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
    return col + vec3(glint);
  }

  void main() {
    vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
    float f = field(p);
    // weiche Kante über etwa einen Gerätepixel
    float aa = 0.75 / uDpr;
    vec3 col;
    if (f < -aa) col = inside(p, f);
    else if (f > aa) col = outside(p, f);
    else col = mix(inside(p, f), outside(p, f), smoothstep(-aa, aa, f));
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
  ['uRes', 'uDpr', 'uTime', 'uCount', 'uRect', 'uParam', 'uShift', 'uPad', 'uFx', 'uDrop', 'uDropN',
    'uTex0', 'uTex1', 'uTex2', 'uTex3', 'uTex4', 'uTex5']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  /* --------------------------- Ebenen ------------------------------ */
  // Reihenfolge im DOM = Zeichenreihenfolge (hinten → vorne)
  const pair = (v) => (v ? v.split(',').map(Number) : [0, 0]);
  const sprites = [...stage.querySelectorAll('[data-sprite]')].slice(0, MAX).map((el) => ({
    el,
    blur: parseFloat(el.dataset.blur) || 0,
    shadow: el.dataset.shadow !== undefined ? parseFloat(el.dataset.shadow) : 1,
    sway: el.dataset.sway !== undefined ? parseFloat(el.dataset.sway) : 0.05,
    depth: el.dataset.depth !== undefined ? parseFloat(el.dataset.depth) : 20,
    flip: 'flip' in el.dataset,
    open: pair(el.dataset.open),
    grow: parseFloat(el.dataset.grow) || 0,
    base: [0, 0, 1, 1],
  }));
  const anchor = sprites.find((s) => 'anchor' in s.el.dataset) || sprites[0];

  const PAD = 0.2;
  function textureFor(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const p = Math.round(Math.max(w, h) * PAD);
    const cv = document.createElement('canvas');
    cv.width = w + 2 * p;
    cv.height = h + 2 * p;
    cv.getContext('2d').drawImage(img, p, p, w, h);
    const tex = gl.createTexture();
    tex.pad = [p / w, p / h];
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  const whenLoaded = (img) => (img.complete && img.naturalWidth
    ? (img.decode ? img.decode().catch(() => {}) : Promise.resolve())
    : new Promise((res, rej) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', rej, { once: true }); }));

  /* --------------------------- Layout ------------------------------ */
  let W = 0, H = 0, dpr = 1;
  let dprCap = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75);
  const rects = new Float32Array(MAX * 4);
  const params = new Float32Array(MAX * 4);
  const shifts = new Float32Array(MAX * 2);
  const pads = new Float32Array(MAX * 2);
  const fx = new Float32Array(MAX * 4);
  let anchorBox = { x: 0, y: 0, w: 1, h: 1 };

  function measure() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    dpr = dprCap;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    sprites.forEach((s, i) => {
      const el = s.el;
      const rot = parseFloat(getComputedStyle(el).rotate) || 0;
      s.base = [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight];
      const bias = s.blur > 0 ? Math.log2(1 + s.blur * dpr) : 0;
      params.set([rot * Math.PI / 180, bias, s.sway, i * 1.7], i * 4);
      fx.set([s.shadow, s.flip ? 1 : 0, 0, 0], i * 4);
      if (s === anchor) anchorBox = { x: s.base[0], y: s.base[1], w: s.base[2], h: s.base[3] };
    });
  }

  // Beim Scrollen öffnet sich der Busch, die Schere tritt nach vorn
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  function updateRects() {
    const p = reduceMotion ? 0 : ease(Math.min(1, Math.max(0, scrollY / (H * 0.7))));
    sprites.forEach((s, i) => {
      const [x, y, w, h] = s.base;
      const g = 1 + s.grow * p;
      rects.set([x + s.open[0] * p - (w * (g - 1)) / 2, y + s.open[1] * p - (h * (g - 1)) / 2, w * g, h * g], i * 4);
      fx[i * 4 + 2] = Math.max(0, Math.log2((s.el.naturalWidth || w) / (w * g * dpr)));
    });
  }

  /* -------------------- Glastropfen-Choreografie ------------------- */
  // Positionen relativ zur Schere (Anker); Werte außerhalb 0…1 liegen neben ihr
  const DROPS = [
    { fx: -0.55, fy: 0.22, r: 0.30, amp: 14, sp: 0.21, ph: 0.0 },
    { fx: 1.30, fy: 0.16, r: 0.20, amp: 12, sp: 0.17, ph: 1.3 },
    { fx: 0.85, fy: 0.92, r: 0.24, amp: 14, sp: 0.13, ph: 2.1 },
    { fx: -0.95, fy: 0.86, r: 0.14, amp: 10, sp: 0.25, ph: 3.4 },
    { fx: 1.60, fy: 0.70, r: 0.12, amp: 9, sp: 0.30, ph: 4.2 },
    { fx: 0.30, fy: -0.06, r: 0.10, amp: 9, sp: 0.33, ph: 5.0 },
    { fx: -0.20, fy: 1.14, r: 0.09, amp: 8, sp: 0.28, ph: 0.7 },
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
    pointer.tr = active ? Math.max(46, anchorBox.w * (isTouch ? 0.32 : 0.26)) : 0;
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
    updateRects();
    updateDrops(t);
    sprites.forEach((s, i) => shifts.set([-look.x * s.depth, -look.y * s.depth * 0.6], i * 2));
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uTime, t);
    gl.uniform1i(U.uCount, sprites.length);
    gl.uniform4fv(U.uRect, rects);
    gl.uniform4fv(U.uParam, params);
    gl.uniform2fv(U.uShift, shifts);
    gl.uniform2fv(U.uPad, pads);
    gl.uniform4fv(U.uFx, fx);
    gl.uniform4fv(U.uDrop, drops);
    gl.uniform1i(U.uDropN, 1 + DROPS.length);
    units.forEach((tex, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U[`uTex${i}`], i);
    });
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
  let off = false;
  function start() {
    if (running || reduceMotion || off) return;
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
  Promise.all(sprites.map((s) => whenLoaded(s.el))).then(() => {
    units = sprites.map((s) => textureFor(s.el));
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
    desktop.addEventListener?.('change', (m) => {
      if (m.matches) return;
      off = true;
      stop();
      hero.classList.remove('is-gl', 'is-gl-done');
      hero.classList.add('hero--static');
    });
    start();
  }).catch((err) => {
    console.warn('Hero-Bilder konnten nicht geladen werden:', err);
    hero.classList.add('hero--static');
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    hero.classList.remove('is-gl', 'is-gl-done');
    hero.classList.add('hero--static');
  });
})();
