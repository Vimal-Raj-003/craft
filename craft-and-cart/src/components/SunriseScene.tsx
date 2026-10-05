"use client";

/* Thai Pongal at sunrise: the sun climbs over the horizon over a clay pot of pongal that boils over. */

const HORIZON = 250;

function Palm({ x, h }: { x: number; h: number }) {
  const tx = x + 4;
  const ty = HORIZON - h;
  const fronds: [number, number][] = [[-80, 26], [-62, -2], [-34, -24], [0, -30], [34, -22], [62, 2], [82, 28]];
  return (
    <g opacity=".8" stroke="#6b3417" fill="none" strokeLinecap="round">
      <path d={`M${x} ${HORIZON} C ${x + 8} ${HORIZON - h * 0.4}, ${x - 6} ${HORIZON - h * 0.75}, ${tx} ${ty}`} strokeWidth="6" />
      {fronds.map(([ex, ey], i) => (
        <path key={i} d={`M${tx} ${ty} Q ${tx + ex * 0.55} ${ty + ey * 0.3 - 28} ${tx + ex} ${ty + ey}`} strokeWidth="4" />
      ))}
    </g>
  );
}

/** A tapered blade (lens shape) with a lighter mid-rib, used for sugarcane leaves. */
function Blade({ x, y, dx, len, w }: { x: number; y: number; dx: number; len: number; w: number }) {
  const tx = x + dx;
  const ty = y + len * 0.3;
  const mx = x + dx * 0.5;
  return (
    <g>
      <path d={`M${x} ${y} Q ${mx - w} ${y - len * 0.6} ${tx} ${ty} Q ${mx + w} ${y - len * 0.3} ${x} ${y} Z`} fill="url(#leafG)" />
      <path d={`M${x} ${y} Q ${mx} ${y - len * 0.45} ${tx} ${ty}`} stroke="#d4eba0" strokeWidth="1.3" fill="none" opacity=".65" />
    </g>
  );
}

/** Three green sugarcane stalks tied together with a red cloth: jointed, waxy-bloomed nodes, shaded like a cylinder, with arching leaves. */
function Canes({ x, flip = false }: { x: number; flip?: boolean }) {
  const stalks = [{ x: 30, h: 360, d: 0 }, { x: 78, h: 410, d: -1.4 }, { x: 126, h: 330, d: -2.6 }];
  return (
    <svg x={x} y={70} width={110} height={270} viewBox="0 0 170 440" overflow="visible">
      <g transform={flip ? "translate(170 0) scale(-1 1)" : undefined}>
        {stalks.map((s) => {
          const top = 440 - s.h;
          const nodes = Array.from({ length: Math.floor(s.h / 52) }, (_, k) => top + 24 + k * 52 + (k % 2 ? 7 : -3) + ((k * 13) % 5));
          return (
            <g key={s.x} className="sway" style={{ animationDelay: `${s.d}s` }}>
              <ellipse cx={s.x + 2} cy={440} rx="22" ry="5" fill="#2a1406" opacity=".35" />
              {/* the cylinder, shaded from the sun on the left */}
              <rect x={s.x - 13} y={top} width="26" height={s.h} rx="9" fill="url(#caneG)" />
              {/* faint lengthwise fibres */}
              {[-8, -4, 0, 4, 8].map((o, i) => <line key={i} x1={s.x + o} y1={top + 10} x2={s.x + o + (i - 2) * 0.6} y2="436" stroke={i % 2 ? "#1c3a12" : "#cfe59a"} strokeWidth=".9" opacity=".26" />)}
              {nodes.map((ny, k) => (
                <g key={k}>
                  <ellipse cx={s.x} cy={ny + 5} rx="13.5" ry="3.4" fill="#1d3a12" opacity=".38" />
                  <ellipse cx={s.x} cy={ny} rx="14.5" ry="5" fill="url(#caneNode)" />
                  <ellipse cx={s.x} cy={ny - 5} rx="13.5" ry="3" fill="#f1f2dc" opacity=".55" />
                  {k % 2 === 0 && <ellipse cx={s.x - 2} cy={ny + 1} rx="3" ry="1.2" fill="#5a3b1c" opacity=".55" />}
                </g>
              ))}
              {/* top of the stalk: leaf sheath and arching blades */}
              <path d={`M${s.x - 13} ${top + 9} Q ${s.x} ${top - 10} ${s.x + 13} ${top + 9} Z`} fill="#5f8f2e" />
              <Blade x={s.x} y={top + 4} dx={-84} len={104} w={11} />
              <Blade x={s.x} y={top + 4} dx={80} len={98} w={11} />
              <Blade x={s.x} y={top + 2} dx={-30} len={78} w={7} />
              <Blade x={s.x} y={top + 2} dx={34} len={84} w={7} />
              <Blade x={s.x} y={top} dx={4} len={60} w={6} />
            </g>
          );
        })}
        {/* red cloth tying the bundle */}
        <g>
          <rect x="14" y="282" width="126" height="15" rx="5" fill="url(#cloth)" />
          <path d="M20 289 H134" stroke="#ffd34d" strokeWidth="1.6" strokeDasharray="2 5" opacity=".85" />
          <path d="M128 296 q8 14 3 28 M134 296 q10 10 8 24" stroke="#b5261b" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
/** Flat kolam seen in perspective on the ground. */
function GroundKolam({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s} ${s * 0.27})`} fill="none" stroke="#fff4e0" strokeWidth="2" strokeLinecap="round" opacity=".92">
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-34" rx="14" ry="34" transform={`rotate(${i * 30})`} />
      ))}
      <circle r="74" strokeDasharray="1 9" strokeWidth="3" />
      <circle r="92" strokeDasharray="1 9" strokeWidth="3" />
      <circle r="6" fill="#fff4e0" stroke="none" />
    </g>
  );
}

/** A traditional clay Pongal pot: shaded terracotta with grain and soot, painted neck band, turmeric plant tied on, rice froth boiling over. */
function Pot() {
  return (
    <g transform="translate(-60 -153) scale(.5)">
      {/* soft steam */}
      {[70, 120, 170].map((x, i) => (
        <path key={x} className="steam" style={{ animationDelay: `${i * 1.2}s` }} d={`M${x} 40 q-10 -14 0 -26 t0 -26`} stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".6" filter="url(#softBlur)" />
      ))}

      {/* turmeric plant (manjal kothu) tied around the neck */}
      <g>
        {[[-1, 46, 190], [-0.55, 22, 210], [0, 0, 226], [0.55, -22, 210], [1, -46, 190]].map(([k, o, len], i) => (
          <g key={i}>
            <path d={`M${120 + (o as number) * 0.6} 112 C ${120 + (k as number) * 34} ${112 - (len as number) * 0.5}, ${120 + (k as number) * 70} ${112 - (len as number) * 0.62}, ${120 + (k as number) * 84} ${112 - (len as number) * 0.28} C ${120 + (k as number) * 56} ${112 - (len as number) * 0.55}, ${120 + (k as number) * 22} ${112 - (len as number) * 0.4}, ${120 + (o as number) * 0.6 + 6} 112 Z`} fill="url(#leafG)" />
            <path d={`M${120 + (o as number) * 0.6 + 3} 112 C ${120 + (k as number) * 30} ${112 - (len as number) * 0.4}, ${120 + (k as number) * 60} ${112 - (len as number) * 0.52}, ${120 + (k as number) * 84} ${112 - (len as number) * 0.28}`} stroke="#d9efa8" strokeWidth="1.6" fill="none" opacity=".6" />
          </g>
        ))}
      </g>

      {/* ground contact shadow */}
      <ellipse cx="120" cy="262" rx="86" ry="9" fill="#2a1005" opacity=".35" />

      {/* the pot body */}
      <path d="M64 108 C 38 122 16 162 18 202 C 20 242 62 264 120 264 C 178 264 220 242 222 202 C 224 162 202 122 176 108 Z" fill="url(#clayBody)" filter="url(#clayGrain)" />
      <path d="M64 108 C 38 122 16 162 18 202 C 20 242 62 264 120 264 C 178 264 220 242 222 202 C 224 162 202 122 176 108 Z" fill="url(#clayShade)" />
      {/* soot from the fire */}
      <ellipse cx="120" cy="268" rx="100" ry="52" fill="url(#soot)" clipPath="url(#potClip)" />
      {/* sun-side highlight and rim light */}
      <ellipse cx="62" cy="180" rx="11" ry="50" transform="rotate(10 62 180)" fill="#fff4d6" opacity=".26" filter="url(#softBlur)" />
      <path d="M170 118 C 206 138 218 176 214 210" stroke="#ffb27a" strokeWidth="3" fill="none" opacity=".22" strokeLinecap="round" filter="url(#softBlur)" />

      {/* rim */}
      <ellipse cx="120" cy="108" rx="62" ry="17" fill="url(#clayRim)" />
      <ellipse cx="120" cy="106" rx="50" ry="11" fill="#3a1305" />
      <path d="M58 110 Q 120 130 182 110" stroke="#5a2209" strokeWidth="2" fill="none" opacity=".5" />

      {/* painted neck band: white lime dashes, kumkum dots, turmeric line */}
      <path d="M30 150 Q 120 178 210 150" stroke="#fff4e0" strokeWidth="7" fill="none" strokeDasharray="2.5 9" strokeLinecap="round" opacity=".92" />
      <path d="M26 170 Q 120 200 214 170" stroke="#d62c1f" strokeWidth="6" fill="none" strokeDasharray="1 13" strokeLinecap="round" />
      <path d="M24 186 Q 120 216 216 186" stroke="#f2b01e" strokeWidth="3.4" fill="none" opacity=".95" />
      {/* red thread tying the leaves at the neck */}
      <path d="M72 118 Q 120 134 168 118" stroke="#c4261b" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <path d="M72 118 Q 120 134 168 118" stroke="#ff8a7a" strokeWidth="1.4" fill="none" strokeDasharray="3 5" opacity=".7" />

      {/* rice froth boiling over */}
      <g className="foam">
        <ellipse cx="120" cy="100" rx="66" ry="22" fill="#d9ccaa" opacity=".55" />
        <ellipse cx="120" cy="94" rx="64" ry="21" fill="url(#foamG)" />
        {[[78, 86, 21], [104, 75, 25], [140, 76, 25], [166, 87, 20], [120, 64, 21], [92, 62, 14], [152, 62, 14]].map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="url(#foamG)" />
            <circle cx={(cx as number) - (r as number) * 0.32} cy={(cy as number) - (r as number) * 0.36} r={(r as number) * 0.26} fill="#fff" opacity=".85" />
          </g>
        ))}
        {[[96, 70], [126, 82], [150, 70], [110, 58], [138, 60], [82, 90], [160, 92]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="1.6" fill="#caa86a" opacity=".45" />)}
      </g>
      {/* milk running down the side */}
      {[[84, 0, 38], [120, 1.1, 50], [160, 2.1, 34]].map(([x, d, len]) => (
        <g key={x} className="drip" style={{ animationDelay: `${d}s` }}>
          <path d={`M${(x as number) - 7} 110 C ${(x as number) - 8} ${110 + (len as number) * 0.6}, ${(x as number) - 5} ${110 + (len as number)}, ${x} ${114 + (len as number)} C ${(x as number) + 5} ${110 + (len as number)}, ${(x as number) + 8} ${110 + (len as number) * 0.6}, ${(x as number) + 7} 110 Z`} fill="url(#foamG)" />
          <ellipse cx={(x as number) - 2} cy={116 + (len as number) * 0.4} rx="1.6" ry="6" fill="#fff" opacity=".7" />
        </g>
      ))}
      {[96, 124, 150].map((x, i) => (
        <circle key={x} className="bubble" style={{ animationDelay: `${i * 0.8}s` }} cx={x} cy="78" r="5" fill="#fff" opacity=".9" />
      ))}
    </g>
  );
}
function Stove() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="86" ry="9" fill="rgba(60,20,5,.28)" />
      <rect x="-52" y="-14" width="104" height="9" rx="4" fill="#5a2a12" transform="rotate(-4)" />
      {[-42, 42].map((x) => <ellipse key={x} cx={x} cy="-10" rx="22" ry="13" fill="#8d8d92" />)}
      {[-26, -6, 14, 32].map((x, i) => (
        <path key={x} className="foam" style={{ animationDelay: `${i * 0.3}s` }} d={`M${x} -8 c-12 -12 -2 -22 0 -34 c8 11 16 20 0 34 z`} fill={i % 2 ? "#ff8a00" : "#e8334f"} />
      ))}
    </g>
  );
}

export default function SunriseScene() {
  const rays = Array.from({ length: 30 }, (_, i) => i * 12);
  return (
    <svg
      viewBox="0 0 1440 340" preserveAspectRatio="xMinYMax slice" aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 z-0 h-[270px] w-[1143px] max-w-none -translate-x-[170px] [mask-image:linear-gradient(to_bottom,transparent_0,#000_16%)] md:inset-x-0 md:h-[340px] md:w-full md:translate-x-0"
    >
      <defs>
        <linearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0" />
          <stop offset="1" stopColor="#ff8a3d" stopOpacity=".6" />
        </linearGradient>
        <radialGradient id="sunCore2" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset=".6" stopColor="#ffc933" />
          <stop offset="1" stopColor="#f58a00" />
        </radialGradient>
        <radialGradient id="halo2" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffe27a" stopOpacity=".85" />
          <stop offset="1" stopColor="#ffe27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dca062" />
          <stop offset="1" stopColor="#a3592b" />
        </linearGradient>
        {/* sugarcane: green cylinder lit from the left, yellow-green nodes, tapered leaves */}
        <linearGradient id="caneG" x1="0" x2="1">
          <stop offset="0" stopColor="#274d17" />
          <stop offset=".28" stopColor="#5f8f2e" />
          <stop offset=".42" stopColor="#8ab94c" />
          <stop offset=".72" stopColor="#3f6d22" />
          <stop offset="1" stopColor="#21401a" />
        </linearGradient>
        <linearGradient id="caneNode" x1="0" x2="1">
          <stop offset="0" stopColor="#8aa33f" />
          <stop offset=".45" stopColor="#d7de86" />
          <stop offset="1" stopColor="#7a9535" />
        </linearGradient>
        <linearGradient id="leafG" x1="0" x2="1">
          <stop offset="0" stopColor="#2c5f1c" />
          <stop offset=".5" stopColor="#62a238" />
          <stop offset="1" stopColor="#2f6a1f" />
        </linearGradient>
        <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2483a" />
          <stop offset=".55" stopColor="#c4261b" />
          <stop offset="1" stopColor="#8f1a12" />
        </linearGradient>
        {/* clay pot */}
        <linearGradient id="clayBody" x1="0" x2="1">
          <stop offset="0" stopColor="#7e3214" />
          <stop offset=".3" stopColor="#d9783f" />
          <stop offset=".46" stopColor="#e89a5c" />
          <stop offset=".78" stopColor="#b4521f" />
          <stop offset="1" stopColor="#6e2a10" />
        </linearGradient>
        <linearGradient id="clayShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0e03" stopOpacity="0" />
          <stop offset=".6" stopColor="#2a0e03" stopOpacity=".08" />
          <stop offset="1" stopColor="#1a0802" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="clayRim" x1="0" x2="1">
          <stop offset="0" stopColor="#a4481d" />
          <stop offset=".4" stopColor="#ee9c62" />
          <stop offset="1" stopColor="#8a3814" />
        </linearGradient>
        <radialGradient id="soot" cx="50%" cy="100%" r="60%">
          <stop offset="0" stopColor="#120804" stopOpacity=".75" />
          <stop offset="1" stopColor="#120804" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="foamG" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".6" stopColor="#fbf3dd" />
          <stop offset="1" stopColor="#e6d6ae" />
        </radialGradient>
        <clipPath id="potClip"><path d="M64 108 C 38 122 16 162 18 202 C 20 242 62 264 120 264 C 178 264 220 242 222 202 C 224 162 202 122 176 108 Z" /></clipPath>
        <filter id="softBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id="clayGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 .22  0 0 0 0 .08  0 0 0 0 .02  0 0 0 .5 -.1" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" result="gc" />
          <feBlend in="SourceGraphic" in2="gc" mode="multiply" />
        </filter>        <clipPath id="aboveHorizon"><rect x="0" y="0" width="1440" height={HORIZON} /></clipPath>
      </defs>

      <rect x="0" y="0" width="1440" height={HORIZON} fill="url(#skyGlow)" />

      {/* the sun rises from behind the horizon */}
      <g clipPath="url(#aboveHorizon)">
        <g className="sunrise">
          <circle cx="470" cy="268" r="330" fill="url(#halo2)" className="sun-glow" />
          <g transform="translate(470 268) scale(1.3)">
            <g className="sun-rays">
              {rays.map((a, i) => (
                <path key={a} d="M -8 -150 L 0 -250 L 8 -150 Z" transform={`rotate(${a})`} fill={i % 2 ? "#f5a623" : "#e8334f"} opacity={i % 2 ? 0.7 : 0.5} />
              ))}
            </g>
            <circle r="128" fill="url(#sunCore2)" />
            <circle r="128" fill="none" stroke="#e8334f" strokeWidth="5" strokeDasharray="3 11" strokeLinecap="round" opacity=".7" />
          </g>
        </g>
      </g>

      {/* thatched village house with a kaavi-red band */}
      <g transform="translate(1110 0)">
        <rect x="14" y="204" width="136" height="46" fill="#f6e3b8" />
        <rect x="14" y="236" width="136" height="14" fill="#b5361f" />
        <rect x="68" y="214" width="28" height="36" rx="3" fill="#5a2a12" />
        <polygon points="-4,206 82,148 168,206" fill="#8a5a2b" />
        {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={8 + i * 26} y1="204" x2={50 + i * 14} y2="162" stroke="#6b3e1d" strokeWidth="2" opacity=".6" />)}
      </g>

      {/* distant palms & birds */}
      <Palm x={880} h={150} />
      <Palm x={960} h={118} />
      <Palm x={1060} h={170} />
      <Palm x={1240} h={135} />
      {[0, -7, -13].map((d, i) => (
        <g key={i} className="bird" style={{ animationDelay: `${d}s` }} transform={`translate(0 ${70 + i * 26})`}>
          <path d="M0 0 q8 -9 16 0 q8 -9 16 0" stroke="#7a1d00" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* ground */}
      <rect x="0" y={HORIZON} width="1440" height={340 - HORIZON} fill="url(#ground)" />
      <line x1="0" y1={HORIZON} x2="1440" y2={HORIZON} stroke="#ffe9a6" strokeWidth="2" opacity=".8" />
      <GroundKolam cx={540} cy={312} s={1.25} />
      <GroundKolam cx={960} cy={308} s={1.2} />

      <Canes x={4} />
      <Canes x={1326} flip />

      {/* pongal being cooked */}
      <g transform="translate(300 292) scale(1.45)">
        <g transform="translate(174 0)">
          <Stove />
          <Pot />
        </g>
      </g>

      <g className="pongal-chip" transform="translate(552 62)">
        <rect x="-98" y="-17" width="196" height="34" rx="17" fill="#e8334f" />
        <rect x="-98" y="-17" width="196" height="34" rx="17" fill="none" stroke="#f5a623" strokeWidth="2.5" />
        <text x="0" y="6" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff">பொங்கலோ பொங்கல்! 🎉</text>
      </g>

      {/* twinkling jasmine petals */}
      {[[560, 120], [700, 70], [790, 150], [1150, 100]].map(([x, y], i) => (
        <circle key={i} className="twinkle" style={{ animationDelay: `${i * 0.7}s` }} cx={x} cy={y} r="3" fill="#fffdf5" />
      ))}
    </svg>
  );
}
