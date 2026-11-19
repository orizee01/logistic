// Animated delivery scene for the sign-in page: a truck driving along a scrolling road past a city
// skyline, while a tracking dot travels the route from pickup to drop-off. Drawn in SVG so it stays
// sharp and needs no image files. Animations live in styles.css (.ill-*) and stop for reduced motion.

const ROUTE = 'M78 70 C 150 20, 230 110, 300 62 S 400 40, 410 58';

function Skyline() {
  return (
    <>
      <g fill="#ffffff" opacity="0.13">
        <rect x="18" y="150" width="46" height="130" rx="4" />
        <rect x="70" y="118" width="38" height="162" rx="4" />
        <rect x="114" y="168" width="54" height="112" rx="4" />
        <rect x="186" y="140" width="34" height="140" rx="4" />
        <rect x="236" y="176" width="48" height="104" rx="4" />
        <rect x="300" y="138" width="40" height="142" rx="4" />
        <rect x="346" y="104" width="52" height="176" rx="4" />
        <rect x="404" y="160" width="58" height="120" rx="4" />
      </g>
      <g className="ill-windows" fill="#ffffff" opacity="0.22">
        {[0, 1, 2, 3].map((row) =>
          [0, 1].map((col) => <rect key={`a${row}${col}`} x={80 + col * 14} y={132 + row * 22} width="7" height="10" rx="1.5" />),
        )}
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2].map((col) => <rect key={`b${row}${col}`} x={356 + col * 13} y={118 + row * 24} width="7" height="10" rx="1.5" />),
        )}
      </g>
    </>
  );
}

function Wheel({ cx, cy = 280, r = 18 }: { cx: number; cy?: number; r?: number }) {
  const hub = r / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#1c2333" />
      <g className="ill-wheel">
        <circle cx={cx} cy={cy} r={hub} fill="#c9d3e8" />
        <path d={`M${cx} ${cy - hub} V${cy + hub} M${cx - hub} ${cy} H${cx + hub}`} stroke="#1c2333" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Truck() {
  return (
    <g className="ill-truck">
      <g className="ill-truck-body">
        {/* Cargo box */}
        <rect x="118" y="178" width="178" height="96" rx="10" fill="#ffffff" />
        <rect x="118" y="252" width="178" height="22" fill="#e6ecff" />
        <path d="M207 206 l14 14 -14 14 -14 -14 Z" fill="#1f5eff" />
        <text x="207" y="250" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#1f5eff">
          SwiftDrop
        </text>
        {/* Cab */}
        <path d="M300 204 h44 c8 0 14 4 18 11 l18 30 c2 4 3 8 3 12 v17 h-83 Z" fill="url(#ill-cab)" />
        <path d="M312 214 h30 c4 0 7 2 9 5 l13 23 h-52 Z" fill="#9fc0ff" />
        <rect x="370" y="258" width="12" height="8" rx="2" fill="#ffd166" />
        {/* Headlight beam, shown at night */}
        <path className="ill-night" d="M382 258 L480 236 L480 290 L382 266 Z" fill="url(#ill-beam)" />
      </g>
      <Wheel cx={164} />
      <Wheel cx={252} />
      <Wheel cx={340} />
    </g>
  );
}

// Delivery rider on a motorbike with a SwiftDrop box on the back.
function Motorbike() {
  return (
    <g className="ill-truck">
      <g className="ill-truck-body">
        {/* Exhaust */}
        <rect x="150" y="262" width="52" height="7" rx="3.5" fill="#9aa3b5" />
        {/* Delivery box */}
        <rect x="132" y="166" width="78" height="64" rx="8" fill="#ffffff" />
        <rect x="132" y="214" width="78" height="16" fill="#ffe2cc" />
        <path d="M171 180 l11 11 -11 11 -11 -11 Z" fill="#f26b1d" />
        <text x="171" y="226" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill="#c2410c">
          SwiftDrop
        </text>
        {/* Bike body */}
        <path d="M196 238 h92 l26 30 h-36 l-14 -12 h-58 Z" fill="#ffffff" />
        <path d="M206 238 h76 l8 10 h-84 Z" fill="#f26b1d" />
        <rect x="228" y="252" width="36" height="18" rx="4" fill="#2a3142" />
        {/* Seat */}
        <rect x="204" y="228" width="58" height="11" rx="5.5" fill="#1c2333" />
        {/* Front fork and handlebar */}
        <path d="M292 214 L312 272" stroke="#2a3142" strokeWidth="7" strokeLinecap="round" />
        <path d="M282 206 L300 200" stroke="#1c2333" strokeWidth="6" strokeLinecap="round" />
        {/* Headlight + night beam */}
        <circle cx="306" cy="226" r="7" fill="#ffd166" />
        <path className="ill-night" d="M312 222 L480 196 L480 262 L312 232 Z" fill="url(#ill-beam)" />

        {/* Rider */}
        <path d="M236 226 L266 240 L262 266" fill="none" stroke="#0f1733" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M262 266 h12" stroke="#1c2333" strokeWidth="8" strokeLinecap="round" />
        <path d="M234 226 L254 182" stroke="#1e3a8a" strokeWidth="24" strokeLinecap="round" />
        <path d="M238 214 L250 188" stroke="#f26b1d" strokeWidth="5" strokeLinecap="round" />
        <path d="M256 188 L286 206" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" />
        <circle cx="288" cy="206" r="5" fill="#1c2333" />
        {/* Helmet with visor */}
        <circle cx="262" cy="160" r="17" fill="#ffffff" />
        <path d="M262 143 a17 17 0 0 1 17 17 h-17 Z" fill="#f26b1d" />
        <path d="M266 156 h14 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-12 Z" fill="#1c2333" />
      </g>
      <Wheel cx={182} cy={274} r={24} />
      <Wheel cx={316} cy={274} r={24} />
    </g>
  );
}

export function LogisticsIllustration({ vehicle = 'truck' }: { vehicle?: 'truck' | 'motorbike' }) {
  // The motorbike rider's helmet sits where the sun is in the truck scene, so move the sun/moon right.
  const skyShift = vehicle === 'motorbike' ? 'translate(140 8)' : undefined;
  return (
    <svg
      className="logistics-illustration"
      viewBox="0 0 480 340"
      role="img"
      aria-label={`A SwiftDrop ${vehicle === 'truck' ? 'delivery truck' : 'rider on a motorbike'} driving through the city while a parcel is tracked from pickup to drop-off`}
    >
      <defs>
        <radialGradient id="ill-sun-glow">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ill-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff6c7" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff6c7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ill-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe7ff" />
        </linearGradient>
      </defs>

      {/* Day: sun. Night: moon and twinkling stars. Which one shows follows the app theme (styles.css). */}
      <g className="ill-day" transform={skyShift}>
        <circle cx="250" cy="118" r="46" fill="url(#ill-sun-glow)" />
        <circle className="ill-sun" cx="250" cy="118" r="20" fill="#ffe08a" />
      </g>
      <g className="ill-night">
        <g transform={skyShift}>
          <circle cx="250" cy="118" r="44" fill="url(#ill-sun-glow)" opacity="0.35" />
          <path d="M262 100a20 20 0 1 0 6 27 16 16 0 1 1-6-27Z" fill="#f4f1ff" />
        </g>
        {[
          [30, 26, 1.6],
          [140, 16, 1.2],
          [196, 54, 1.8],
          [330, 18, 1.4],
          [372, 92, 1.2],
          [458, 76, 1.7],
          [24, 104, 1.3],
          [160, 92, 1.1],
        ].map(([cx, cy, r], i) => (
          <circle key={i} className="ill-star" cx={cx} cy={cy} r={r} fill="#ffffff" style={{ animationDelay: `${(i % 4) * 0.6}s` }} />
        ))}
      </g>

      {/* City skyline, drawn twice side by side so it can scroll in a seamless loop */}
      <g className="ill-skyline">
        <Skyline />
        <g transform="translate(480 0)">
          <Skyline />
        </g>
      </g>

      {/* Tracked route between pickup and drop-off */}
      <path className="ill-route" d={ROUTE} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" opacity="0.85" />
      <g>
        <path d="M78 76 c-10-12-16-19-16-27a16 16 0 0 1 32 0c0 8-6 15-16 27Z" fill="#ffffff" />
        <circle cx="78" cy="49" r="6" fill="#1f5eff" />
      </g>
      <g className="ill-pin-drop">
        <path d="M410 64 c-10-12-16-19-16-27a16 16 0 0 1 32 0c0 8-6 15-16 27Z" fill="#ffd166" />
        <circle cx="410" cy="37" r="6" fill="#1f5eff" />
      </g>

      {/* Parcel tracking dot: travels the route every 6s */}
      <g className="ill-tracker">
        <circle r="11" fill="#ffd166" opacity="0.35">
          <animateMotion dur="6s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" />
        </circle>
        <circle r="6" fill="#ffd166" stroke="#ffffff" strokeWidth="2.5">
          <animateMotion dur="6s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" />
        </circle>
      </g>

      {/* Delivered tick: pops when the tracking dot arrives */}
      <g transform="translate(428 14)">
        <g className="ill-check">
          <circle r="13" fill="#2ecc71" stroke="#ffffff" strokeWidth="3" />
          <path d="M-5 0 l3.5 3.5 L5.5 -4" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* Road with lane markings that scroll past */}
      <rect x="0" y="280" width="480" height="60" fill="#0b1b4d" opacity="0.35" />
      <g className="ill-lanes" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.55">
        {[20, 100, 180, 260, 340, 420, 500].map((x) => (
          <line key={x} x1={x} y1="312" x2={x + 40} y2="312" />
        ))}
      </g>

      {/* Speed lines */}
      <g className="ill-speed" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.6">
        <line x1="60" y1="214" x2="110" y2="214" />
        <line x1="42" y1="236" x2="104" y2="236" />
        <line x1="70" y1="258" x2="108" y2="258" />
      </g>

      {vehicle === 'truck' ? <Truck /> : <Motorbike />}
    </svg>
  );
}
