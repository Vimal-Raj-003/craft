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

function Canes({ x, flip = false }: { x: number; flip?: boolean }) {
  const stalks = [{ x: 30, h: 360, d: 0 }, { x: 78, h: 410, d: -1.4 }, { x: 126, h: 330, d: -2.6 }];
  return (
    <svg x={x} y={70} width={110} height={270} viewBox="0 0 170 440" overflow="visible">
      <g transform={flip ? "translate(170 0) scale(-1 1)" : undefined}>
        {stalks.map((s) => (
          <g key={s.x} className="sway" style={{ animationDelay: `${s.d}s` }}>
            <rect x={s.x - 9} y={440 - s.h} width="18" height={s.h} rx="6" fill="url(#cane)" />
            {Array.from({ length: Math.floor(s.h / 46) }, (_, k) => (
              <rect key={k} x={s.x - 10} y={440 - s.h + 18 + k * 46} width="20" height="5" rx="2.5" fill="#d9b25a" opacity=".9" />
            ))}
            <path d={`M${s.x} ${446 - s.h} C ${s.x - 40} ${420 - s.h}, ${s.x - 62} ${450 - s.h}, ${s.x - 70} ${500 - s.h}`} stroke="#2f9e44" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d={`M${s.x} ${446 - s.h} C ${s.x + 40} ${416 - s.h}, ${s.x + 62} ${446 - s.h}, ${s.x + 68} ${494 - s.h}`} stroke="#1f7a3a" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d={`M${s.x} ${444 - s.h} C ${s.x} ${410 - s.h}, ${s.x + 6} ${396 - s.h}, ${s.x + 2} ${382 - s.h}`} stroke="#2f9e44" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
        ))}
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

function Pot() {
  return (
    <g transform="translate(-60 -153) scale(.5)">
      {[70, 120, 170].map((x, i) => (
        <path key={x} className="steam" style={{ animationDelay: `${i * 1.2}s` }} d={`M${x} 40 q-10 -14 0 -26 t0 -26`} stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".75" />
      ))}
      <path d="M52 112 C 22 150 24 218 70 244 C 100 258 140 258 170 244 C 216 218 218 150 188 112 Z" fill="url(#clay)" />
      <rect x="64" y="96" width="112" height="22" rx="11" fill="#b95a2a" />
      <path d="M34 168 Q120 192 206 168" stroke="#fff4e0" strokeWidth="6" fill="none" strokeDasharray="1 12" strokeLinecap="round" />
      <path d="M32 186 Q120 210 208 186" stroke="#ffd34d" strokeWidth="5" fill="none" />
      <path d="M34 200 Q120 224 206 200" stroke="#e8334f" strokeWidth="5" fill="none" />
      <path d="M120 112 C 70 96 54 60 66 28 C 92 46 112 76 120 112 Z" fill="#2f9e44" />
      <path d="M120 112 C 170 96 186 60 174 28 C 148 46 128 76 120 112 Z" fill="#1f7a3a" />
      <path d="M120 112 C 112 78 116 54 120 18 C 128 54 130 78 120 112 Z" fill="#3cb55a" />
      <rect x="66" y="102" width="108" height="9" rx="4.5" fill="#e8334f" />
      <g className="foam">
        <ellipse cx="120" cy="92" rx="62" ry="22" fill="#fffdf5" />
        {[[78, 84, 20], [104, 74, 24], [138, 76, 24], [164, 86, 19], [120, 66, 20]].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#fffdf5" />
        ))}
      </g>
      {[[82, 0], [118, 1.1], [158, 2.1]].map(([x, d]) => (
        <ellipse key={x} className="drip" style={{ animationDelay: `${d}s` }} cx={x} cy="108" rx="6" ry="10" fill="#fffdf5" />
      ))}
      {[96, 124, 150].map((x, i) => (
        <circle key={x} className="bubble" style={{ animationDelay: `${i * 0.8}s` }} cx={x} cy="78" r="5" fill="#fff" />
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
        <linearGradient id="cane" x1="0" x2="1">
          <stop offset="0" stopColor="#4a1a5c" />
          <stop offset=".5" stopColor="#7b3a8c" />
          <stop offset="1" stopColor="#3b1450" />
        </linearGradient>
        <linearGradient id="clay" x1="0" x2="1">
          <stop offset="0" stopColor="#a8481f" />
          <stop offset=".45" stopColor="#d4713a" />
          <stop offset="1" stopColor="#8c3a17" />
        </linearGradient>
        <clipPath id="aboveHorizon"><rect x="0" y="0" width="1440" height={HORIZON} /></clipPath>
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
