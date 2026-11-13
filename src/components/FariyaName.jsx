import { memo } from 'react';

const NAME = 'Fariya';
/* One colour per letter, from soft rose through pink to saffron gold. */
const COLORS = ['#ffd6e2', '#ffb3c8', '#ff8fb0', '#ff9f9a', '#f7b36e', '#f0b54a'];

/**
 * The premium animated name. Each letter rises out of a blur, then floats in a gentle wave
 * with a golden glow, while a sheen sweeps across and little stars twinkle around it.
 * `size` is any CSS font-size, `delay` is seconds before the entrance starts.
 */
function FariyaName({ as: Tag = 'span', className = '', size = '1em', delay = 0, tight = true }) {
  return (
    <Tag
      aria-label={NAME}
      className={`relative inline-block select-none font-display font-bold leading-none ${className}`}
      style={{ fontSize: size, letterSpacing: tight ? '-0.03em' : '0.02em' }}
    >
      <span aria-hidden="true" className="relative inline-flex overflow-visible">
        {NAME.split('').map((ch, i) => (
          <span key={i} className="inline-block animate-rise" style={{ animationDelay: `${delay + i * 0.09}s` }}>
            <span
              className="inline-block animate-wave"
              style={{ animationDelay: `${delay + 0.9 + i * 0.18}s` }}
            >
              <span
                className="inline-block animate-glow bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(180deg, #fff 0%, ${COLORS[i]} 45%, ${COLORS[Math.min(5, i + 1)]} 100%)`,
                  WebkitBackgroundClip: 'text',
                  animationDelay: `${delay + 0.9 + i * 0.18}s`,
                }}
              >
                {ch}
              </span>
            </span>
          </span>
        ))}
        {/* light sheen passing over the letters */}
        <span className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-overlay">
          <span
            className="absolute inset-y-0 left-0 w-1/5 animate-sheen bg-gradient-to-r from-transparent via-white/80 to-transparent"
            style={{ animationDelay: `${delay + 1.6}s` }}
          />
        </span>
        {/* twinkling stars */}
        <span className="pointer-events-none absolute -right-[0.18em] -top-[0.12em] h-[0.26em] w-[0.26em] animate-twinkle bg-[#fff2c4]"
          style={{ clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)', animationDelay: `${delay + 1.2}s` }} />
        <span className="pointer-events-none absolute -left-[0.12em] bottom-[0.02em] h-[0.18em] w-[0.18em] animate-twinkle bg-[#ffd6e2]"
          style={{ clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)', animationDelay: `${delay + 2.4}s` }} />
      </span>
    </Tag>
  );
}
export default memo(FariyaName);
