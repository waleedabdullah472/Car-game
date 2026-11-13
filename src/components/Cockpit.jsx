const HOOD = 'M150 292 Q500 218 850 292 L950 336 L50 336Z';
export default function Cockpit() {
  return (
    <div id="cockpit" hidden aria-hidden="true">
      <svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="cdash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#262c33" /><stop offset="1" stopColor="#0c0f13" /></linearGradient>
          <linearGradient id="chood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".30" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></linearGradient>
          <linearGradient id="cglare" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".10" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        </defs>
        <path id="hood" d={HOOD} fill="#d8402f" />
        <path d={HOOD} fill="url(#chood)" />
        <path d="M60 0 L112 0 L228 268 L176 276Z" fill="#0b0d10" /><path d="M0 292 L176 276 L228 268 L240 300 L0 330Z" fill="#0b0d10" />
        <path d="M940 0 L888 0 L772 268 L824 276Z" fill="#0b0d10" /><path d="M1000 292 L824 276 L772 268 L760 300 L1000 330Z" fill="#0b0d10" />
        <path d="M0 300 Q500 230 1000 300 L1000 420 L0 420Z" fill="url(#cdash)" />
        <path d="M0 300 Q500 230 1000 300" fill="none" stroke="#3a424b" strokeWidth="3" />
        <rect x="330" y="300" width="340" height="120" rx="20" fill="#0a0c10" />
        <g id="cluster" fontFamily="IBM Plex Mono, ui-monospace, monospace" textAnchor="middle">
          <circle cx="430" cy="352" r="46" fill="#10151b" stroke="#2c353f" strokeWidth="3" />
          <circle cx="570" cy="352" r="46" fill="#10151b" stroke="#2c353f" strokeWidth="3" />
          <path id="needle" d="M430 352 L430 314" stroke="#f0b54a" strokeWidth="3" strokeLinecap="round" />
          <text id="cSpeed" x="570" y="360" fill="#eef1f4" fontSize="24" fontWeight="600">0</text>
          <text x="570" y="380" fill="#a9b8c6" fontSize="10">km/h</text>
        </g>
        <g id="wheel" style={{ transformOrigin: '500px 400px' }}>
          <circle cx="500" cy="400" r="150" fill="none" stroke="#14171b" strokeWidth="26" />
          <circle cx="500" cy="400" r="150" fill="none" stroke="#2b3138" strokeWidth="3" />
          <path d="M352 392 L440 404 M648 392 L560 404 M500 548 L500 450" stroke="#14171b" strokeWidth="22" strokeLinecap="round" />
          <circle cx="500" cy="404" r="50" fill="#191d22" stroke="#2f363e" strokeWidth="3" />
          <path d="M500 424s-18-11-22-22c-3-8 2-17 11-17 5 0 9 3 11 6 2-3 6-6 11-6 9 0 14 9 11 17-4 11-22 22-22 22z" fill="#ff8fb0" />
        </g>
        <rect x="0" y="0" width="1000" height="420" fill="url(#cglare)" opacity=".5" />
      </svg>
    </div>
  );
}
