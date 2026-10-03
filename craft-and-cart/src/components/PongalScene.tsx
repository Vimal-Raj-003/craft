"use client";

/** Mango-leaf & marigold toran, hung just under the navbar like a doorway garland. */
export default function PongalScene() {
  const items = Array.from({ length: 40 }, (_, i) => i);
  const y = (x: number) => 8 + 26 * Math.sin((Math.PI * (x % 300)) / 300);
  return (
    <svg
      viewBox="0 0 2000 130" preserveAspectRatio="xMidYMin slice" aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[80px] z-[5] h-[104px] w-full drop-shadow-[0_6px_6px_rgba(122,29,0,.25)]"
    >
      <path d="M0 8 Q150 42 300 8 T600 8 T900 8 T1200 8 T1500 8 T1800 8 T2100 8" fill="none" stroke="#7a1d00" strokeWidth="4" />
      <path d="M0 8 Q150 42 300 8 T600 8 T900 8 T1200 8 T1500 8 T1800 8 T2100 8" fill="none" stroke="#f5a623" strokeWidth="1.5" strokeDasharray="2 7" />
      {items.map((i) => {
        const x = i * 50 + 25;
        return (
          <g key={i} transform={`translate(${x} ${y(x)})`}>
            <g className="swing" style={{ animationDelay: `${(i % 7) * -0.5}s` }}>
              {i % 3 === 1 ? (
                <>
                  <line x1="0" y1="0" x2="0" y2="22" stroke="#7a1d00" strokeWidth="2.5" />
                  {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy="-9" rx="6" ry="10" transform={`translate(0 34) rotate(${a})`} fill="#ff9d00" stroke="#c76a00" strokeWidth=".8" />)}
                  <circle cx="0" cy="34" r="6.5" fill="#d35400" />
                </>
              ) : (
                <>
                  <path d="M0 0 C 17 16, 17 46, 0 76 C -17 46, -17 16, 0 0 Z" fill={i % 2 ? "#2f9e44" : "#1f7a3a"} stroke="#0f4d22" strokeWidth="1.4" />
                  <path d="M0 6 L0 68" stroke="#c4f0bc" strokeWidth="1.8" />
                  <path d="M0 20 L9 30 M0 34 L10 44 M0 48 L8 56 M0 20 L-9 30 M0 34 L-10 44 M0 48 L-8 56" stroke="#c4f0bc" strokeWidth="1" opacity=".7" fill="none" />
                </>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
