/* ============================================
   ABN GROUP — INTERACCIONES
   Aurora WebGL (integración) · reveal · counters
   · navbar · form · CTA routing
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================
     AURORA — WEBGL FLUID GRADIENT (paleta oficial)
     Reservada a la sección de INTEGRACIÓN.
     Blend orgánico de Tech Green · Light Blue ·
     Cosmos Violet · Creative Orange (nunca lineal).
     ======================================== */
  const canvas = document.getElementById('aurora-canvas');
  if (canvas) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (gl) {
      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

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
          for(int i=0;i<6;i++){ f += amp*noise(p*freq); freq*=2.0; amp*=0.5; }
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

      function createShader(type, src){
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
          console.error('Shader error:', gl.getShaderInfoLog(s));
          gl.deleteShader(s); return null;
        }
        return s;
      }

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

          function draw(elapsed){
            mSX += (mTX - mSX) * 0.14;
            mSY += (mTY - mSY) * 0.14;
            gl.uniform1f(uTime, elapsed);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform2f(uMouse, mSX, mSY);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          }

          canvas.classList.add('ready');

          if (prefersReduced) {
            // single static frame — no animation loop
            draw(24.0);
          } else {
            // animate only while the section is on screen (perf)
            const start = performance.now();
            let running = false, rafId = null;
            const loop = () => {
              draw((performance.now() - start) / 1000);
              rafId = requestAnimationFrame(loop);
            };
            const io = new IntersectionObserver((entries) => {
              entries.forEach((en) => {
                if (en.isIntersecting && !running) {
                  running = true; loop();
                } else if (!en.isIntersecting && running) {
                  running = false;
                  if (rafId) cancelAnimationFrame(rafId);
                }
              });
            }, { threshold: 0.01 });
            if (section) io.observe(section); else loop();
          }
        }
      }
    }
  }


  /* ========================================
     REVEAL ON SCROLL
     ======================================== */
  const reveals = document.querySelectorAll('.reveal');
  if (prefersReduced) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => revealObserver.observe(el));
  }


  /* ========================================
     COUNTERS (cifras / métricas)
     ======================================== */
  const counters = document.querySelectorAll('[data-target]');
  const formatCount = (el, value) => {
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    el.textContent = prefix + value.toFixed(decimals) + suffix;
  };
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.target);
    if (prefersReduced) { formatCount(el, target); return; }
    const duration = 1500;
    const startT = performance.now();
    const step = (now) => {
      const p = Math.min((now - startT) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      formatCount(el, target * eased);
      if (p < 1) requestAnimationFrame(step);
      else formatCount(el, target);
    };
    requestAnimationFrame(step);
  };
  if (counters.length) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => countObserver.observe(el));
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

});
