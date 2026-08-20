/* ============================================
   ABN GROUP — INTERACCIONES
   Idioma de motion autoral (reveal por línea / direccional),
   counters con fallback, parallax de tiles, timeline,
   navbar, form, CTA routing, magnetic — y por último la
   Aurora WebGL (aislada para no bloquear el resto).
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Marca JS activo: los estados "ocultos" del reveal se aplican SOLO con .js,
  // así el sitio es legible aunque JS falle o esté deshabilitado.
  document.documentElement.classList.add('js');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* ========================================
     LOADER + VIDEO HERO
     El reel de marca es el hero. El loader ("despertando
     agentes") cubre la carga; la barra sigue el buffer real
     y se completa al poder reproducir. Fallbacks: aurora +
     logo estático (reduced-motion, error, sin video).
     ======================================== */
  const loader = document.getElementById('loader');
  const heroVideo = document.getElementById('hero-video');
  const loaderFill = document.getElementById('loader-fill');
  const hideLoader = () => { if (loader) loader.classList.add('is-done'); };

  const saveData = navigator.connection && navigator.connection.saveData;
  if (heroVideo && !prefersReduced && !saveData) {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    heroVideo.src = portrait ? heroVideo.dataset.srcPortrait : heroVideo.dataset.srcLandscape;

    // visitas repetidas en la sesión (volver de una unidad): sin loader,
    // el video simplemente aparece cuando está listo
    if (sessionStorage.getItem('abn:seen')) hideLoader();

    const start = () => {
      document.getElementById('hero').classList.add('hero--video');
      if (loaderFill) loaderFill.style.transform = 'scaleX(1)';
      setTimeout(hideLoader, 450);
      sessionStorage.setItem('abn:seen', '1');
      // autoplay bloqueado (battery saver, etc.) → volver al fallback aurora
      heroVideo.play().catch(() => {
        document.getElementById('hero').classList.remove('hero--video');
        hideLoader();
      });
    };
    const onProgress = () => {
      if (!loaderFill || !heroVideo.duration) return;
      const buf = heroVideo.buffered.length ? heroVideo.buffered.end(heroVideo.buffered.length - 1) : 0;
      loaderFill.style.transform = `scaleX(${Math.min(buf / heroVideo.duration, 0.95)})`;
    };
    heroVideo.addEventListener('progress', onProgress);
    heroVideo.addEventListener('canplay', start, { once: true });
    heroVideo.addEventListener('error', hideLoader, { once: true });
    // failsafe: si a los 4s no está listo, arrancamos igual con lo que haya
    setTimeout(() => {
      if (loader && !loader.classList.contains('is-done')) {
        if (heroVideo.readyState >= 2) start(); else hideLoader();
      }
    }, 4000);
    heroVideo.load();
  } else {
    hideLoader();
  }


  /* ========================================
     SCROLL RESTORE — "Ver más" a página de unidad y vuelta
     Guardamos la posición al salir; al volver, la restauramos.
     ======================================== */
  const SCROLL_KEY = 'abn:index-scroll';
  // guarda posición: botones "Ver más" y también los cards flagship de casos
  document.querySelectorAll('.unit-more, .cases--flag .case').forEach(a => {
    a.addEventListener('click', () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)));
  });
  if (document.body.dataset.page !== 'unit') {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      sessionStorage.removeItem(SCROLL_KEY);
      const y = parseInt(saved, 10) || 0;
      // instant: sin esto, html{scroll-behavior:smooth} anima un flythrough desde arriba
      window.scrollTo({ top: y, behavior: 'instant' });
      // re-aplicar tras cargar la fuente (el swap corre el layout), salvo que el usuario ya haya scrolleado
      if (document.fonts && document.fonts.ready) {
        const before = window.scrollY;
        document.fonts.ready.then(() => {
          if (Math.abs(window.scrollY - before) < 4) window.scrollTo({ top: y, behavior: 'instant' });
        });
      }
    }
  }
  // vuelta por botón Back (bfcache): el browser ya restaura solo — descartamos la clave
  window.addEventListener('pageshow', (e) => { if (e.persisted) sessionStorage.removeItem(SCROLL_KEY); });


  /* ========================================
     MARQUESINA — auto-scroll + drag (mouse y touch)
     JS reemplaza la animación CSS (que queda como fallback
     sin JS): loop infinito envolviendo módulo el ancho del
     track, pausa en hover (solo pointer fino) y drag libre.
     ======================================== */
  const marquee = document.querySelector('.marquee');
  if (marquee) {
    const tracks = Array.from(marquee.querySelectorAll('.marquee-track'));
    if (tracks.length === 2) {
      marquee.classList.add('marquee--js');
      const canHover = window.matchMedia('(hover: hover)').matches;
      const SPEED = 60; // px/s de auto-scroll
      let x = 0, dragging = false, hovering = false, lastPX = 0, period = 0;

      const measure = () => { period = tracks[0].offsetWidth; };
      const apply = () => {
        if (period > 0) x = ((x % period) + period) % period;
        const t = `translateX(${(-x).toFixed(2)}px)`;
        tracks[0].style.transform = t;
        tracks[1].style.transform = t;
      };
      measure();
      window.addEventListener('resize', () => { measure(); apply(); }, { passive: true });

      let lastT = performance.now();
      const tick = (now) => {
        const dt = Math.min((now - lastT) / 1000, 0.1);
        lastT = now;
        if (!dragging && !(canHover && hovering) && !prefersReduced) {
          x += SPEED * dt;
          apply();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      marquee.addEventListener('pointerenter', () => { hovering = true; });
      marquee.addEventListener('pointerleave', () => { hovering = false; });
      marquee.addEventListener('pointerdown', (e) => {
        dragging = true; lastPX = e.clientX;
        marquee.classList.add('dragging');
        marquee.setPointerCapture(e.pointerId);
      });
      marquee.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        x -= (e.clientX - lastPX);
        lastPX = e.clientX;
        apply();
      });
      const endDrag = () => { dragging = false; marquee.classList.remove('dragging'); };
      marquee.addEventListener('pointerup', endDrag);
      marquee.addEventListener('pointercancel', endDrag);
    }
  }


  /* ========================================
     HASH EN CARGA INICIAL — salto instantáneo
     Con html{scroll-behavior:smooth}, llegar con #ancla desde
     otra página anima desde arriba y a veces no llega. Jump directo.
     ======================================== */
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: 'instant' });
      // re-asegurar tras el primer layout completo (fuentes/imágenes)
      setTimeout(() => {
        const r = target.getBoundingClientRect();
        if (Math.abs(r.top) > 80) target.scrollIntoView({ behavior: 'instant' });
      }, 250);
    }
  }


  /* ========================================
     REVEAL ON SCROLL — idioma de motion autoral
     .reveal (soporte) · .reveal-lines (por línea, clip)
     · .reveal-side (direccional) · .reveal-tl (timeline)
     ======================================== */
  const reveals = document.querySelectorAll('.reveal, .reveal-lines, .reveal-side, .reveal-tl');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => revealObserver.observe(el));
  }


  /* ========================================
     COUNTERS (cifras / métricas) — con fallback robusto
     ======================================== */
  const counters = document.querySelectorAll('[data-target]');
  const formatCount = (el, value) => {
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    el.textContent = prefix + value.toFixed(decimals) + suffix;
  };
  const setFinal = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    formatCount(el, parseFloat(el.dataset.target));
  };
  const runCounter = (el) => {
    if (el.dataset.done) return;
    const target = parseFloat(el.dataset.target);
    if (prefersReduced) { setFinal(el); return; }
    el.dataset.started = '1';
    const duration = 1500;
    const startT = performance.now();
    const step = (now) => {
      const p = Math.min((now - startT) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      formatCount(el, target * eased);
      if (p < 1) requestAnimationFrame(step);
      else setFinal(el);
    };
    requestAnimationFrame(step);
  };
  if (counters.length) {
    if (prefersReduced || !('IntersectionObserver' in window)) {
      // Sin animación posible → mostramos el valor final directamente.
      counters.forEach(setFinal);
    } else {
      const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(el => countObserver.observe(el));
      // Fallback: si el observer no disparó (layout raro, ya visible sin cruzar
      // el umbral, etc.), fijamos el valor final para no dejar "$0M" en pantalla.
      setTimeout(() => {
        counters.forEach(el => {
          if (!el.dataset.started && !el.dataset.done) {
            const r = el.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) runCounter(el);
          }
        });
      }, 2600);
    }
  }


  /* ========================================
     PARALLAX SUTIL DE TILES (gradiente de unidades)
     transform-only, escribe --py en un rAF batcheado
     ======================================== */
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length && !prefersReduced) {
    let pTicking = false;
    const updateParallax = () => {
      pTicking = false;
      const h = window.innerHeight;
      parallaxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > h + 240) return; // fuera de pantalla
        const factor = parseFloat(el.dataset.parallax) || 0.06;
        const off = ((r.top + r.height / 2) - h / 2) * factor;
        el.style.setProperty('--py', off.toFixed(1) + 'px');
      });
    };
    const onPScroll = () => { if (!pTicking) { pTicking = true; requestAnimationFrame(updateParallax); } };
    window.addEventListener('scroll', onPScroll, { passive: true });
    window.addEventListener('resize', onPScroll, { passive: true });
    updateParallax();
  }


  /* ========================================
     NAVBAR SCROLL
     ======================================== */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  /* ========================================
     SMOOTH ANCHOR LINKS
     ======================================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });


  /* ========================================
     CTA ROUTING — preseleccionar unidad de interés
     (intercepta Unidades antes de las verticales)
     ======================================== */
  const unitSelect = document.getElementById('f-unidad');
  const goToContact = (unit) => {
    if (unitSelect && unit) {
      const match = Array.from(unitSelect.options).some(o => o.value === unit);
      if (match) unitSelect.value = unit;
    }
    const contact = document.getElementById('contacto');
    if (contact) contact.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    const first = document.getElementById('f-nombre');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), prefersReduced ? 0 : 700);
  };

  document.querySelectorAll('[data-unit]').forEach(el => {
    el.addEventListener('click', () => goToContact(el.dataset.unit));
  });


  /* ========================================
     FORMULARIO DE CONTACTO
     ======================================== */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        status.textContent = 'Revisá los campos marcados, por favor.';
        status.classList.add('is-err');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.textContent = 'Enviando…';

      const done = () => {
        form.reset();
        submitBtn.disabled = false;
        status.textContent = '¡Gracias! Recibimos tu mensaje. Te contactamos en breve.';
        status.classList.add('is-ok');
      };
      const fail = () => {
        submitBtn.disabled = false;
        status.innerHTML = 'No pudimos enviar el formulario. Escribinos a <a href="mailto:contacto@abngroup.com">contacto@abngroup.com</a>.';
        status.classList.add('is-err');
      };

      // Endpoint sin configurar → procesamos en el cliente (demo).
      if (form.action.includes('your-form-id')) {
        setTimeout(done, 700);
        return;
      }

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) done(); else fail();
      } catch (err) {
        fail();
      }
    });
  }


  /* ========================================
     TIMELINE — línea que se dibuja al scroll
     + ignición de nodos en color de unidad (transform/opacity)
     ======================================== */
  const tlTrack = document.querySelector('.tl-track');
  const tlFill = document.querySelector('.tl-rail-fill');
  const tlItems = Array.from(document.querySelectorAll('.tl-item'));
  if (tlTrack && tlItems.length) {
    if (prefersReduced) {
      if (tlFill) tlFill.style.transform = 'scaleY(1)';
      tlItems.forEach(it => it.classList.add('in-view'));
    } else {
      const rail = tlTrack.querySelector('.tl-rail') || tlTrack;
      let ticking = false;
      const update = () => {
        ticking = false;
        const railRect = rail.getBoundingClientRect();
        const refLine = window.innerHeight * 0.68;
        // progress along the rail (0..1)
        const p = (refLine - railRect.top) / Math.max(railRect.height, 1);
        const clamped = Math.max(0, Math.min(1, p));
        if (tlFill) tlFill.style.setProperty('--tl-progress', clamped.toFixed(4));
        // activate nodes whose dot has passed the reference line
        tlItems.forEach(item => {
          const node = item.querySelector('.tl-node');
          const ny = (node || item).getBoundingClientRect().top + 20;
          item.classList.toggle('in-view', ny <= refLine);
        });
      };
      const onTlScroll = () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      };
      window.addEventListener('scroll', onTlScroll, { passive: true });
      window.addEventListener('resize', onTlScroll, { passive: true });
      update();
    }
  }


  /* ========================================
     HERO — pausar la aurora de fondo fuera del viewport (perf)
     ======================================== */
  const heroEl = document.getElementById('hero');
  if (heroEl && !prefersReduced && 'IntersectionObserver' in window) {
    const heroIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        heroEl.classList.toggle('hero--paused', !en.isIntersecting);
        // el video también descansa fuera del viewport
        if (heroVideo && heroEl.classList.contains('hero--video')) {
          if (en.isIntersecting) heroVideo.play().catch(() => {});
          else heroVideo.pause();
        }
      });
    }, { threshold: 0 });
    heroIO.observe(heroEl);
  }


  /* ========================================
     MAGNETIC BUTTONS — micro-interacción táctil
     (pointer fino · respeta reduced-motion)
     ======================================== */
  if (!prefersReduced && window.matchMedia('(pointer: fine)').matches) {
    const clamp = (v, m) => Math.max(-m, Math.min(m, v));
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      const strength = 0.28, max = 9;
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) * strength, max);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) * strength, max);
        btn.style.transform = `translate(${dx.toFixed(1)}px, ${(dy - 2).toFixed(1)}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }


  /* ========================================
     AURORA — WEBGL FLUID GRADIENT (paleta oficial)
     Reservada a la sección de INTEGRACIÓN. Va al final y
     aislada en try/catch para no interrumpir nada anterior.
     Blend orgánico de Tech Green · Light Blue ·
     Cosmos Violet · Creative Orange (nunca lineal).
     ======================================== */
  try {
    const canvas = document.getElementById('aurora-canvas');
    if (canvas) {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (gl) {
        // Cap DPR low — the aurora is a soft, blurry gradient, so extra pixels
        // are pure fill-rate cost (the main source of scroll jank on desktop).
        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
          const w = canvas.clientWidth, h = canvas.clientHeight;
          if (!w || !h) return;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          gl.viewport(0, 0, canvas.width, canvas.height);
        };

        const vertSrc = `
          attribute vec2 a_position;
          void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
        `;

        const fragSrc = `
          precision highp float;
          uniform float u_time;
          uniform vec2 u_resolution;
          uniform vec2 u_mouse;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            f = f*f*(3.0-2.0*f);
            float a = hash(i), b = hash(i+vec2(1.0,0.0));
            float c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
            return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
          }
          float fbm(vec2 p){
            float f = 0.0, amp = 0.5, freq = 1.0;
            for(int i=0;i<4;i++){ f += amp*noise(p*freq); freq*=2.0; amp*=0.5; }
            return f;
          }

          void main(){
            vec2 uv = gl_FragCoord.xy / u_resolution;
            float aspect = u_resolution.x / u_resolution.y;
            vec2 p = uv; p.x *= aspect;

            float t = u_time * 0.07;

            /* gentle fluid distortion toward cursor */
            vec2 m = u_mouse; m.x *= aspect;
            vec2 toMouse = p - m;
            float md = length(toMouse);
            float mf = smoothstep(0.9, 0.0, md);
            p += normalize(toMouse + 0.001) * mf * 0.04;

            /* domain warping (IQ style) */
            vec2 q = vec2(
              fbm(p*2.4 + t*0.6),
              fbm(p*2.4 + vec2(5.2,1.3) + t*0.5)
            );
            vec2 r = vec2(
              fbm(p*2.4 + q*3.4 + vec2(1.7,9.2) + t*0.35),
              fbm(p*2.4 + q*3.4 + vec2(8.3,2.8) + t*0.4)
            );
            float f  = fbm(p*2.4 + r*3.0 + t*0.15);
            float f2 = fbm(p*1.7 + vec2(f*2.0, r.x*1.5) + t*0.2);
            float blend = f*0.65 + f2*0.35;

            /* ---- paleta oficial ---- */
            vec3 base   = vec3(0.075, 0.075, 0.082);   /* carbon deep */
            vec3 green  = vec3(0.227, 0.741, 0.588);   /* Tech Green   */
            vec3 lblue  = vec3(0.345, 0.506, 0.941);   /* Light Blue   */
            vec3 violet = vec3(0.678, 0.529, 1.000);   /* Cosmos Violet*/
            vec3 orange = vec3(0.969, 0.494, 0.169);   /* Creative Orange */

            vec3 col = base;
            col = mix(col, green,  smoothstep(0.10, 0.42, blend));
            col = mix(col, lblue,  smoothstep(0.34, 0.60, blend));
            col = mix(col, violet, smoothstep(0.54, 0.78, blend));
            col = mix(col, orange, smoothstep(0.76, 0.98, blend) * 0.9);

            /* brightness from warping intensity */
            float warp = length(q) + length(r)*0.5;
            col *= 0.80 + 0.42 * smoothstep(0.5, 1.5, warp);

            /* soft vignette so text stays legible */
            float vig = 1.0 - 0.5 * pow(length(uv - 0.5) * 1.25, 2.0);
            col *= max(vig, 0.0);

            col = pow(col, vec3(0.92));
            gl_FragColor = vec4(col, 1.0);
          }
        `;

        const createShader = (type, src) => {
          const s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
            console.error('Shader error:', gl.getShaderInfoLog(s));
            gl.deleteShader(s); return null;
          }
          return s;
        };

        const vert = createShader(gl.VERTEX_SHADER, vertSrc);
        const frag = createShader(gl.FRAGMENT_SHADER, fragSrc);

        if (vert && frag) {
          const program = gl.createProgram();
          gl.attachShader(program, vert);
          gl.attachShader(program, frag);
          gl.linkProgram(program);

          if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);

            const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
            const aPos = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            const uTime  = gl.getUniformLocation(program, 'u_time');
            const uRes   = gl.getUniformLocation(program, 'u_resolution');
            const uMouse = gl.getUniformLocation(program, 'u_mouse');

            let mTX = 0.5, mTY = 0.5, mSX = 0.5, mSY = 0.5;
            const section = document.querySelector('.integration');

            if (section && window.matchMedia('(pointer: fine)').matches && !prefersReduced) {
              section.addEventListener('mousemove', (e) => {
                const rect = section.getBoundingClientRect();
                mTX = (e.clientX - rect.left) / rect.width;
                mTY = 1.0 - (e.clientY - rect.top) / rect.height;
              });
              section.addEventListener('mouseleave', () => { mTX = 0.5; mTY = 0.5; });
            }

            resize();
            window.addEventListener('resize', resize, { passive: true });

            const draw = (elapsed) => {
              mSX += (mTX - mSX) * 0.14;
              mSY += (mTY - mSY) * 0.14;
              gl.uniform1f(uTime, elapsed);
              gl.uniform2f(uRes, canvas.width, canvas.height);
              gl.uniform2f(uMouse, mSX, mSY);
              gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            };

            canvas.classList.add('ready');
            // WebGL is live → drop the blur(70px) CSS fallback out of the render tree
            if (section) section.classList.add('aurora-live');

            if (prefersReduced) {
              // single static frame — no animation loop
              draw(24.0);
            } else {
              // Animate only while the section is on screen AND the tab is visible.
              // Throttle to ~30fps: the aurora drifts slowly, so 30fps looks identical
              // to 60 while halving GPU load — keeps scroll at a smooth 60fps.
              const start = performance.now();
              const FRAME = 1000 / 30;
              let running = false, rafId = null, lastDraw = 0;
              const loop = (now) => {
                rafId = requestAnimationFrame(loop);
                if (now - lastDraw < FRAME) return;
                lastDraw = now;
                draw((now - start) / 1000);
              };
              const startLoop = () => {
                if (running || document.hidden) return;
                running = true; lastDraw = 0;
                rafId = requestAnimationFrame(loop);
              };
              const stopLoop = () => {
                running = false;
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
              };
              let onScreen = false;
              const io = new IntersectionObserver((entries) => {
                entries.forEach((en) => {
                  onScreen = en.isIntersecting;
                  if (onScreen) startLoop(); else stopLoop();
                });
              }, { threshold: 0.01 });
              if (section) io.observe(section); else startLoop();
              document.addEventListener('visibilitychange', () => {
                if (document.hidden) stopLoop();
                else if (onScreen) startLoop();
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Aurora WebGL no disponible:', err);
  }

});
