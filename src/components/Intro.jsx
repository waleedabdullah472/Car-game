import { useState } from 'react';
import FariyaName from './FariyaName.jsx';

const HEARTS = Array.from({ length: 14 }, (_, i) => ({ left: (i * 37 + 8) % 96, delay: (i % 7) * 0.9, dur: 7 + (i % 5), size: 10 + (i % 4) * 5 }));

/** First screen on every load: a gift for Fariya. The tap also unlocks sound and voice. */
export default function Intro() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  if (gone) return null;

  const open = () => {
    setLeaving(true);
    try {
      const a = window.FG && window.FG.audio;
      if (a) { a.init(); a.speak('Fariya. This is special for you, from me. I hope you like it.', true); }
    } catch (e) { /* voice is optional */ }
    setTimeout(() => setGone(true), 700);
  };

  return (
    <div
      id="intro"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden px-6 text-center transition-opacity duration-700 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #3a1a33 0%, #160f1f 55%, #07090f 100%)' }}
      role="dialog" aria-label="A gift for Fariya"
    >
      {HEARTS.map((h, i) => (
        <svg key={i} aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute bottom-[-40px] animate-[floatup_linear_infinite] fill-rose/60"
          style={{ left: `${h.left}%`, width: h.size, height: h.size, animationDuration: `${h.dur}s`, animationDelay: `${h.delay}s` }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ))}
      <p className="animate-rise font-mono text-xs uppercase tracking-[0.45em] text-rose" style={{ animationDelay: '.2s' }}>A gift, just for you</p>
      <h1 className="m-0"><FariyaName size="clamp(3.6rem, 19vw, 9rem)" delay={0.5} /></h1>
      <p className="max-w-[28ch] animate-rise text-lg font-semibold text-ink/90" style={{ animationDelay: '1.9s' }}>
        This game is special for you, from me.<br />You are a very special person to me.
      </p>
      <button
        type="button" id="introGo" onClick={open}
        className="mt-3 animate-rise rounded-full bg-saffron px-8 py-3.5 text-base font-bold text-[#1b1305] shadow-[0_10px_40px_-8px_rgba(240,181,74,.7)] transition hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/70"
        style={{ animationDelay: '2.7s' }}
      >
        Open your gift
      </button>
    </div>
  );
}
