import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { createStage } from './three/stage.js';

const BEATS = [
  { id: '01', name: 'El modelo', in: -1, out: 0.135 },
  { id: '02', name: 'La geometría', in: 0.175, out: 0.345 },
  { id: '03', name: 'El despiece', in: 0.385, out: 0.565 },
  { id: '04', name: 'Los materiales', in: 0.605, out: 0.795 },
  { id: '05', name: 'La cámara', in: 0.835, out: 1.4 },
];

const CALLOUTS = {
  crystal: { n: '01', title: 'Zafiro', sub: 'lathe · 96 lados', dy: -85 },
  bezel: { n: '02', title: 'Bisel', sub: '88 muescas instanced', dy: 20 },
  crown: { n: '03', title: 'Corona', sub: 'cilindro + estriado', dy: 90 },
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

function Reticle() {
  return (
    <svg viewBox="0 0 800 800" fill="none" aria-hidden="true">
      <circle cx="400" cy="400" r="188" stroke="currentColor" strokeWidth="1" />
      <circle cx="400" cy="400" r="248" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" />
      <circle cx="400" cy="400" r="312" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <path d="M400 40v58M400 702v58M40 400h58M702 400h58" stroke="currentColor" strokeWidth="1" />
      <path d="M400 108v20M400 672v20M108 400h20M672 400h20" stroke="currentColor" strokeWidth="1" opacity=".5" />
      {Array.from({ length: 72 }).map((_, i) => {
        const a = (i / 72) * Math.PI * 2;
        const r1 = i % 6 === 0 ? 318 : 324;
        return (
          <line
            key={i}
            x1={400 + Math.sin(a) * r1}
            y1={400 - Math.cos(a) * r1}
            x2={400 + Math.sin(a) * 330}
            y2={400 - Math.cos(a) * 330}
            stroke="currentColor"
            strokeWidth={i % 6 === 0 ? 1.4 : 0.7}
            opacity={i % 6 === 0 ? 0.9 : 0.45}
          />
        );
      })}
      <circle cx="400" cy="72" r="5" fill="none" stroke="#ff3b1e" strokeWidth="1.2" />
    </svg>
  );
}

function MovementDiagram() {
  return (
    <svg className="diagram" viewBox="0 0 520 520" fill="none" aria-hidden="true">
      <circle cx="260" cy="260" r="214" stroke="currentColor" strokeWidth="1" opacity=".35" />
      <circle cx="260" cy="260" r="188" stroke="currentColor" strokeWidth="1" strokeDasharray="3 7" opacity=".5" />
      <g stroke="currentColor" strokeWidth="1.1" opacity=".85">
        <circle cx="196" cy="214" r="62" strokeDasharray="10 6" />
        <circle cx="196" cy="214" r="34" />
        <circle cx="196" cy="214" r="8" />
        <circle cx="330" cy="186" r="40" strokeDasharray="7 5" />
        <circle cx="330" cy="186" r="20" />
        <circle cx="316" cy="330" r="48" strokeDasharray="9 5" />
        <circle cx="316" cy="330" r="25" />
        <circle cx="150" cy="336" r="30" strokeDasharray="6 5" />
        <circle cx="150" cy="336" r="13" />
        <path d="M196 214 330 186M196 214l-46 122M330 186l-14 144M316 330l-166 6" opacity=".45" />
        <path d="M96 260a164 164 0 0 1 118-158" opacity=".5" />
        <path d="M424 260a164 164 0 0 0-118-158" opacity=".5" />
        <path d="M260 74v-32M260 446v32M74 260h-32M446 260h32" opacity=".4" />
      </g>
      <g fill="#ff3b1e">
        <circle cx="196" cy="214" r="4" />
        <circle cx="330" cy="186" r="3.4" />
        <circle cx="316" cy="330" r="3.4" />
        <circle cx="150" cy="336" r="3" />
        <circle cx="260" cy="260" r="3" />
      </g>
      <g stroke="currentColor" strokeWidth="1" opacity=".55">
        <path d="M196 214 96 124h-52" />
        <path d="M330 186 404 100h48" />
        <path d="M316 330 392 396h52" />
      </g>
      <g fill="currentColor" fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="1.4">
        <text x="20" y="116">ESCENA</text>
        <text x="452" y="92" textAnchor="end">CÁMARA</text>
        <text x="444" y="400" textAnchor="end">MODELO</text>
        <text x="260" y="500" textAnchor="middle" opacity=".55">1 CANVAS · 6 PLANOS · 0 MODELOS</text>
      </g>
    </svg>
  );
}

function FallbackDial() {
  return (
    <div className="fallback" role="img" aria-label="Ilustración técnica de la esfera del OCTANT 01">
      <svg viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="168" stroke="currentColor" strokeWidth="1" opacity=".5" />
        <circle cx="200" cy="200" r="148" stroke="currentColor" strokeWidth="10" opacity=".18" />
        <circle cx="200" cy="200" r="138" stroke="currentColor" strokeWidth="1" />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const inner = i % 5 === 0 ? 152 : 160;
          return (
            <line
              key={i}
              x1={200 + Math.sin(a) * inner}
              y1={200 - Math.cos(a) * inner}
              x2={200 + Math.sin(a) * 166}
              y2={200 - Math.cos(a) * 166}
              stroke="currentColor"
              strokeWidth={i % 5 === 0 ? 2 : 1}
              opacity={i % 5 === 0 ? 0.9 : 0.4}
            />
          );
        })}
        <path d="M200 200V108" stroke="currentColor" strokeWidth="7" strokeLinecap="round" transform="rotate(-52 200 200)" />
        <path d="M200 200V86" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform="rotate(38 200 200)" />
        <path d="M200 200V78" stroke="#ff3b1e" strokeWidth="1.5" transform="rotate(146 200 200)" />
        <circle cx="200" cy="200" r="6" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function App() {
  const storyRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const wordmarkRef = useRef(null);
  const reticleRef = useRef(null);
  const fillRef = useRef(null);
  const pctRef = useRef(null);
  const beatNameRef = useRef(null);
  const panelRefs = useRef([]);
  const calloutRefs = useRef({});
  const indexRefs = useRef([]);
  const activeRef = useRef(-1);

  const [phase, setPhase] = useState('loading');
  const [reduced, setReduced] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const sheetRef = useRef(null);
  const lenisRef = useRef(null);
  const promptRef = useRef('');
  const copyTimerRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // keep the prompt text ready so copying does not depend on the network
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}constructor-3d.md`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((text) => {
        if (!cancelled) promptRef.current = text;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const dlg = sheetRef.current;
    if (!dlg) return undefined;
    if (sheetOpen && !dlg.open) dlg.showModal();
    if (!sheetOpen && dlg.open) dlg.close();
    document.documentElement.classList.toggle('sheet-open', sheetOpen);
    return () => document.documentElement.classList.remove('sheet-open');
  }, [sheetOpen]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (sheetOpen) lenis.stop();
    else lenis.start();
  }, [sheetOpen]);

  useEffect(() => {
    const dlg = sheetRef.current;
    if (!dlg) return undefined;
    const onClose = () => setSheetOpen(false);
    dlg.addEventListener('close', onClose);
    return () => dlg.removeEventListener('close', onClose);
  }, []);

  const onProgress = useCallback((p) => {
    const root = stageRef.current;
    if (!root) return;
    root.style.setProperty('--p', p.toFixed(4));

    for (let i = 0; i < BEATS.length; i++) {
      const b = BEATS[i];
      const el = panelRefs.current[i];
      if (!el) continue;
      const fadeIn = b.in < 0 ? 1 : smooth((p - b.in) / 0.035);
      const fadeOut = 1 - smooth((p - b.out) / 0.035);
      const o = Math.min(fadeIn, fadeOut);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.006 ? 'hidden' : 'visible';
      el.style.transform = `translate3d(0, ${((1 - o) * 22).toFixed(1)}px, 0)`;
    }

    if (wordmarkRef.current) {
      const out = 1 - smooth((p - 0.05) / 0.105);
      wordmarkRef.current.style.opacity = out.toFixed(3);
      wordmarkRef.current.style.setProperty('--split', smooth(p / 0.24).toFixed(3));
    }
    if (reticleRef.current) {
      reticleRef.current.style.setProperty('--turn', `${(p * 150).toFixed(1)}deg`);
      reticleRef.current.style.setProperty('--zoom', (1 + smooth(p / 0.25) * 0.22).toFixed(3));
    }
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
    if (pctRef.current) pctRef.current.textContent = String(Math.round(p * 100)).padStart(3, '0');

    let active = 0;
    for (let i = 0; i < BEATS.length; i++) {
      if (p >= (BEATS[i].in < 0 ? 0 : BEATS[i].in) - 0.04) active = i;
    }
    if (active !== activeRef.current) {
      activeRef.current = active;
      if (beatNameRef.current) beatNameRef.current.textContent = BEATS[active].name;
      indexRefs.current.forEach((el, i) => el?.classList.toggle('is-active', i === active));
    }
  }, []);

  const onLabels = useCallback((list) => {
    for (const l of list) {
      const el = calloutRefs.current[l.id];
      if (!el) continue;
      el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
      el.style.opacity = l.opacity.toFixed(3);
      el.style.visibility = l.opacity < 0.01 ? 'hidden' : 'visible';
    }
  }, []);

  useEffect(() => {
    let stage = null;
    let cancelled = false;
    const started = performance.now();

    createStage({
      container: canvasRef.current,
      storyEl: storyRef.current,
      reduced,
      onProgress,
      onLabels,
      onReady: () => {
        const wait = Math.max(0, 850 - (performance.now() - started));
        window.setTimeout(() => {
          if (!cancelled) setPhase('ready');
        }, wait);
      },
      onError: () => {
        if (!cancelled) setPhase('failed');
      },
    })
      .then((s) => {
        if (cancelled) {
          s?.dispose();
          return;
        }
        stage = s;
        if (!s) setPhase('failed');
      })
      .catch(() => {
        if (!cancelled) setPhase('failed');
      });

    return () => {
      cancelled = true;
      stage?.dispose();
    };
  }, [reduced, onProgress, onLabels]);

  useEffect(() => {
    if (reduced) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 1,
      anchors: true,
      respectReducedMotion: true,
    });
    lenisRef.current = lenis;
    return () => {
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [reduced]);

  useEffect(() => {
    if (window.scrollY > 10) return;
    document.documentElement.classList.add('is-top');
    const onScroll = () => {
      if (window.scrollY > 10) document.documentElement.classList.remove('is-top');
      else document.documentElement.classList.add('is-top');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // nav switches to ink over the paper section
  useEffect(() => {
    const cal = document.getElementById('caliber');
    const res = document.getElementById('cierre');
    if (!cal || !res) return undefined;
    const update = () => {
      const y = window.scrollY + 2;
      const light = y >= cal.offsetTop && y < res.offsetTop;
      document.documentElement.classList.toggle('nav-on-light', light);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const copyPrompt = async () => {
    if (copyState === 'copying') return;
    window.clearTimeout(copyTimerRef.current);
    setCopyState('copying');

    try {
      let text = promptRef.current;
      if (!text) {
        const res = await fetch(`${import.meta.env.BASE_URL}constructor-3d.md`, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
        promptRef.current = text;
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // fallback for browsers without the async clipboard API
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('copy failed');
      }

      setCopyState('copied');
      copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 2600);
    } catch {
      setCopyState('error');
      copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 4200);
    }
  };

  return (
    <>
      <a className="skip" href="#instrument">Saltar al contenido</a>

      <header className="nav">
        <a className="nav__brand" href="#top" aria-label="OCTANT — volver al inicio">
          OCTANT<sup>®</sup>
        </a>
        <div className="nav__right">
          <nav className="nav__links" aria-label="Principal">
            <a href="#instrument"><span>01</span> El modelo</a>
            <a href="#caliber"><span>02</span> El montaje</a>
            <a href="#cierre"><span>03</span> Cierre</a>
          </nav>
          <div className="nav__meta">
            <button className="btn btn--sm" type="button" onClick={() => setSheetOpen(true)}>
              Ficha técnica
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <h1 className="sr-only">OCTANT 01 — cómo se construye un reloj 3D en el navegador, capa por capa</h1>

        <section className="stage-wrap" ref={storyRef} id="instrument" aria-label="OCTANT 01, vista de despiece interactiva">
          <div className="stage" ref={stageRef}>
            <div className="stage__bg" aria-hidden="true" />
            <div className="stage__grid" aria-hidden="true" />

            <div className="wordmark" ref={wordmarkRef} aria-hidden="true">
              <span className="wordmark__half wordmark__a">OCT</span>
              <span className="wordmark__half wordmark__b">ANT</span>
            </div>

            <div className="reticle" ref={reticleRef} aria-hidden="true">
              <Reticle />
            </div>

            <div className="canvas-host" ref={canvasRef} />
            {phase === 'failed' && <FallbackDial />}
            <div className="stage__scrim" aria-hidden="true" />

            <div className="beats">
              <article className="beat beat--hero" ref={(el) => { panelRefs.current[0] = el; }}>
                <div className="hero__top">
                  <p className="eyebrow"><span>OT—01</span> Estudio de caso</p>
                  <p className="eyebrow eyebrow--dim hero__top-right">
                    <span className="livedot" aria-hidden="true" />
                    Render en vivo · three.js · WebGL2
                  </p>
                </div>
                <div className="hero__copy">
                  <p className="hero__line">
                    Un reloj que no existe, construido en código.<br />
                    Esta web explica cómo: geometría, materiales y cámara, capa por capa.
                  </p>
                  <ul className="microspec">
                    <li><span>0</span> modelos 3D</li>
                    <li><span>1</span> canvas</li>
                    <li><span>2</span> texturas 2D</li>
                    <li><span>6</span> planos</li>
                  </ul>
                </div>
                <div className="hero__cue">
                  <span>Desliza para desmontar</span>
                  <i aria-hidden="true" />
                </div>
              </article>

              <article className="beat beat--macro" ref={(el) => { panelRefs.current[1] = el; }}>
                <div className="col col--left">
                  <p className="eyebrow"><span>02</span> La geometría</p>
                  <h2 className="h2 h2--small">Escrita.<br /><span className="dim">No importada.</span></h2>
                  <p className="body">
                    Cada pieza se genera al cargar la página. La caja sale de un perfil
                    girado con Lathe; el bisel, de 88 muescas repetidas con instancing.
                    No hay ningún archivo GLB detrás.
                  </p>
                  <dl className="spec-list spec-list--inline">
                    <div><dt>Caja</dt><dd>Lathe · 128 segmentos</dd></div>
                    <div><dt>Bisel</dt><dd>88 muescas instanced</dd></div>
                    <div><dt>Esfera</dt><dd>Canvas 1024²</dd></div>
                    <div><dt>Agujas</dt><dd>Extrude + lume</dd></div>
                  </dl>
                </div>
              </article>

              <article className="beat beat--tear" ref={(el) => { panelRefs.current[2] = el; }}>
                <div className="col col--left col--top">
                  <p className="eyebrow"><span>03</span> El despiece</p>
                  <h2 className="h2 h2--small">Cinco capas.<br /><span className="dim">Un eje.</span></h2>
                  <p className="body">
                    El scroll no reproduce un vídeo: mueve cada grupo a lo largo de su
                    propio vector. La misma variable de progreso coloca la cámara, separa
                    las capas y actualiza el HUD, así que puedes parar en cualquier punto.
                  </p>
                </div>
                <ol className="layer-list layer-list--row">
                  <li><span>01</span><b>Cristal</b><i>lathe</i></li>
                  <li><span>02</span><b>Bisel</b><i>88 instancias</i></li>
                  <li><span>03</span><b>Esfera</b><i>canvas 2D</i></li>
                  <li><span>04</span><b>Movimiento</b><i>4 ruedas</i></li>
                  <li><span>05</span><b>Fondo</b><i>cristal + aro</i></li>
                </ol>
              </article>

              <article className="beat beat--spec" ref={(el) => { panelRefs.current[3] = el; }}>
                <div className="col col--left col--bottom">
                  <p className="eyebrow"><span>04</span> Los materiales</p>
                  <h2 className="h2">Sin fotos.<br /><span className="dim">Sin HDR.</span></h2>
                  <p className="body">
                    Acero, zafiro y latón son MeshPhysicalMaterial: metalness, roughness y
                    clearcoat. La luz viene de un entorno de estudio generado con PMREM a
                    partir de paneles; no se descarga ninguna imagen.
                  </p>
                </div>
                <div className="spec-hint">
                  <i aria-hidden="true" />
                  <span>Arrastra para girar</span>
                </div>
              </article>

              <article className="beat beat--ask" ref={(el) => { panelRefs.current[4] = el; }}>
                <div className="col col--left col--bottom">
                  <p className="eyebrow"><span>05</span> La cámara</p>
                  <h2 className="h2">El scroll<br /><span className="dim">es la cámara.</span></h2>
                  <p className="body">
                    Seis planos, una tabla de cues y amortiguación exponencial. El progreso
                    se convierte en posición, objetivo, FOV y grado de despiece. Al final la
                    pieza queda en tus manos: arrastra para girarla.
                  </p>
                  <div className="ask__row">
                    <a className="btn" href="#instrument">Volver al despiece</a>
                    <button className="text-link" type="button" onClick={() => setSheetOpen(true)}>
                      Abrir ficha técnica <i aria-hidden="true">↗</i>
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div className="callouts" aria-hidden="true">
              {Object.entries(CALLOUTS).map(([id, c], i) => (
                <div
                  className={`callout callout--${id}`}
                  key={id}
                  ref={(el) => { calloutRefs.current[id] = el; }}
                  style={{ transitionDelay: `${i * 30}ms`, '--dy': `${c.dy}px` }}
                >
                  <i className="callout__dot" />
                  <span className="callout__tag">
                    <em>{c.n}</em>
                    <strong>{c.title}</strong>
                    <small>{c.sub}</small>
                  </span>
                </div>
              ))}
            </div>

            <div className="hud" aria-hidden="true">
              <div className="timeline">
                <div className="timeline__meta">
                  <span className="timeline__beat"><b>DESLIZA</b> <span ref={beatNameRef}>{BEATS[0].name}</span></span>
                  <span className="timeline__pct"><span ref={pctRef}>000</span><b>/100</b></span>
                </div>
                <div className="timeline__track">
                  <i className="timeline__fill" ref={fillRef} />
                  <span className="timeline__mark" style={{ left: '25%' }} />
                  <span className="timeline__mark" style={{ left: '50%' }} />
                  <span className="timeline__mark" style={{ left: '75%' }} />
                </div>
              </div>
            </div>

            <div className="index" aria-hidden="true">
              {BEATS.map((b, i) => (
                <span key={b.id} ref={(el) => { indexRefs.current[i] = el; }} className={i === 0 ? 'is-active' : ''}>
                  {b.id}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="caliber" id="caliber">
          <div className="caliber__head">
            <div>
              <p className="eyebrow" style={{ color: 'var(--ink-60)' }}><span style={{ color: 'var(--ink-60)' }}>06</span> El montaje</p>
              <h2 className="caliber__title">
                Bajo el<br /><span>capó.</span>
              </h2>
            </div>
            <div className="caliber__lede">
              <p>
                Vite y React sostienen la página; three.js dibuja la escena sobre WebGL2;
                Lenis suaviza el scroll. Un solo canvas transparente, dos texturas dibujadas
                en 2D y ningún modelo descargado.
              </p>
              <p className="mono-note">Vite 8 / React 19 / three.js 0.187 / Lenis</p>
              <button className="text-link caliber__sheet-link" type="button" onClick={() => setSheetOpen(true)}>
                Abrir ficha técnica <i aria-hidden="true">↗</i>
              </button>
            </div>
          </div>

          <div className="caliber__grid">
            <figure className="caliber__figure">
              <MovementDiagram />
              <figcaption><span>Fig. 08</span> Árbol de escena: un canvas, una cámara, seis planos.</figcaption>
            </figure>

            <dl className="spec-table">
              <div><dt>Stack</dt><dd>Vite 8 · React 19</dd></div>
              <div><dt>Motor 3D</dt><dd>three.js 0.187</dd></div>
              <div><dt>Render</dt><dd>WebGL2 · DPR ≤ 1,75</dd></div>
              <div><dt>Geometría</dt><dd>100 % procedural</dd></div>
              <div><dt>Texturas</dt><dd>Canvas 1024² + 512²</dd></div>
              <div><dt>Scroll</dt><dd>Lenis · sticky 620vh</dd></div>
              <div><dt>Peso</dt><dd>≈857 kB · 231 kB gzip</dd></div>
              <div><dt>Despliegue</dt><dd>Estático</dd></div>
            </dl>
          </div>

          <div className="data-strip">
            <div><strong>0</strong><span>modelos externos</span></div>
            <div><strong>1</strong><span>canvas</span></div>
            <div><strong>6</strong><span>planos de cámara</span></div>
            <div><strong>231</strong><span>kB gzip</span></div>
          </div>

          <div className="dossier" aria-labelledby="dossier-title">
            <div className="dossier__head">
              <p className="eyebrow eyebrow--dark"><span>Anexo</span> El método</p>
              <h2 className="dossier__title" id="dossier-title">
                Llévate<br /><span>el método.</span>
              </h2>
            </div>
            <div className="dossier__side">
              <p className="dossier__copy">
                El prompt maestro con el que se pensó esta página: la entrevista previa,
                la dirección visual, la arquitectura three.js y los criterios de
                aceptación. Úsalo con cualquier IA para construir la siguiente.
              </p>
              <p className="dossier__meta">13 páginas · 379 kB · Markdown y PDF</p>
              <div className="dossier__actions">
                <a
                  className="btn btn--ink"
                  href={`${import.meta.env.BASE_URL}constructor-3d.pdf`}
                  download="CONSTRUCTOR-3D.pdf"
                >
                  Descargar PDF <i aria-hidden="true">↓</i>
                </a>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={copyPrompt}
                  disabled={copyState === 'copying'}
                >
                  {copyState === 'copied'
                    ? 'Prompt copiado'
                    : copyState === 'copying'
                      ? 'Copiando…'
                      : 'Copiar prompt'}
                  <i aria-hidden="true">{copyState === 'copied' ? '✓' : '⧉'}</i>
                </button>
              </div>
              <p className="dossier__status" role="status" aria-live="polite">
                {copyState === 'error'
                  ? 'No se pudo copiar. Descarga el PDF y copia el texto desde ahí.'
                  : copyState === 'copied'
                    ? 'Prompt completo copiado al portapapeles.'
                    : ''}
              </p>
            </div>
          </div>
        </section>

        <section className="outro" id="cierre">
          <div className="outro__inner">
            <p className="eyebrow"><span>07</span> Cierre</p>
            <h2 className="outro__title">Nada que<br />esconder.</h2>
            <div className="outro__side">
              <p className="outro__copy">
                OCTANT 01 es una excusa: un reloj ficticio que se abre capa por capa para
                enseñar cómo se construye una web 3D. Al llegar aquí no queda nada
                escondido. Ni fotos, ni vídeo, ni modelos descargados.
              </p>
              <a className="text-link outro__back" href="#top">Volver al principio <i aria-hidden="true">↑</i></a>
            </div>
          </div>

          <footer className="footer">
            <div className="footer__brand">
              OCTANT<sup>®</sup>
              <span>Estudio de 3D en tiempo real.<br />Hecho con three.js.</span>
            </div>
            <nav className="footer__cols" aria-label="Pie de página">
              <div>
                <h3>Secciones</h3>
                <a href="#instrument">El modelo</a>
                <a href="#caliber">El montaje</a>
                <a href="#cierre">Cierre</a>
              </div>
              <div>
                <h3>Técnica</h3>
                <span>three.js</span>
                <span>WebGL2</span>
                <span>Sin modelos externos</span>
              </div>
              <div>
                <h3>Método</h3>
                <span>Guía de web 3D interactiva</span>
                <span>@designedby.russ</span>
                <span>2026</span>
              </div>
            </nav>
            <div className="footer__legal">
              <p>
                OCTANT 01 es un instrumento ficticio; esta web es su explicación. La
                geometría, los materiales y el movimiento se generan en el navegador con
                three.js: sin GLB, sin metraje de stock y sin texturas en disco.
              </p>
              <p className="footer__method">
                Método: <em>The Interactive 3D Website Guide</em> · @designedby.russ
              </p>
              <p className="footer__copy">© 2026 OCTANT — Estudio de caso.</p>
            </div>
          </footer>
        </section>
      </main>

      <dialog
        className="sheet"
        ref={sheetRef}
        aria-labelledby="sheet-title"
        onClick={(e) => { if (e.target === e.currentTarget) setSheetOpen(false); }}
      >
        <div className="sheet__panel">
          <div className="sheet__head">
            <div>
              <p className="eyebrow"><span>OT—01</span> Documento técnico</p>
              <h2 className="sheet__title" id="sheet-title">Ficha<br />técnica.</h2>
            </div>
            <button
              className="sheet__close"
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Cerrar la ficha técnica"
            >
              Cerrar <span aria-hidden="true">×</span>
            </button>
          </div>

          <p className="sheet__lede">
            Todo lo que ves en esta página se calcula en tu navegador. Esta es la letra
            pequeña: con qué está hecha, qué se genera al vuelo y qué no se descarga.
          </p>

          <dl className="sheet__grid">
            <div><dt>Proyecto</dt><dd>OCTANT 01 · estudio de caso</dd></div>
            <div><dt>Stack</dt><dd>Vite 8 · React 19</dd></div>
            <div><dt>Motor 3D</dt><dd>three.js 0.187 · WebGL2</dd></div>
            <div><dt>Geometría</dt><dd>Extrude, Lathe, RoundedBox, instancing</dd></div>
            <div><dt>Texturas</dt><dd>2 canvas: 1024² y 512²</dd></div>
            <div><dt>Iluminación</dt><dd>Entorno PMREM de paneles · sin HDR</dd></div>
            <div><dt>Scroll</dt><dd>Lenis · sección sticky de 620vh</dd></div>
            <div><dt>Cámara</dt><dd>6 cues · smoothstep + damping</dd></div>
            <div><dt>Tipografía</dt><dd>Archivo variable · IBM Plex Mono</dd></div>
            <div><dt>Peso</dt><dd>≈857 kB JS · 231 kB gzip</dd></div>
            <div><dt>Accesibilidad</dt><dd>Skip link · fallback WebGL · reduced motion</dd></div>
            <div><dt>Modelos externos</dt><dd>0</dd></div>
          </dl>

          <p className="sheet__note">
            La esfera se dibuja una vez en un canvas 2D; el resto es geometría pura. El
            render se pausa fuera de pantalla y el DPR se limita a 1,75.
          </p>
        </div>
      </dialog>

      <div className={`loader ${phase === 'ready' ? 'is-done' : ''}`} aria-hidden={phase === 'ready'}>
        <div className="loader__top">
          <span>OCTANT<sup>®</sup></span>
          <span>OT—01 / WEBGL2</span>
        </div>
        <div className="loader__middle">
          <span className="loader__word">Calibrando</span>
          <div className="loader__bar"><i /></div>
        </div>
        <div className="loader__bottom">
          <span>Geometría en tiempo real · sin modelos</span>
          <span>{phase === 'failed' ? 'WebGL no disponible' : 'Three.js / WebGL2'}</span>
        </div>
      </div>
    </>
  );
}
