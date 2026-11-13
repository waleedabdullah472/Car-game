const Ic = ({ id }) => <svg><use href={`#${id}`} /></svg>;
export default function Hud() {
  return (
    <div id="hud" hidden>
      <div className="hud-row">
        <dl className="pill speed"><dt>Speed</dt><dd><span id="hSpeed">0</span><small>km/h</small></dd></dl>
        <dl className="pill grow"><dt>Score</dt><dd id="hScore">0</dd></dl>
        <dl className="pill dist"><dt>Distance</dt><dd id="hDist">0.00 km</dd></dl>
        <div className="btns">
          <button type="button" className="icon-btn" id="btnView" aria-label="Change camera view (C)"><Ic id="i-view" /></button>
          <button type="button" className="icon-btn" id="btnSound" aria-label="Sound on or off (M)" aria-pressed="false"><Ic id="i-sound" /></button>
          <button type="button" className="icon-btn" id="btnPause" aria-label="Pause (P)"><Ic id="i-pause" /></button>
        </div>
      </div>
      <div className="hud-row second">
        <div className="pill mini hearts" id="hHearts" aria-label="Lives" />
        <div className="pill mini ammo" aria-label="Ammo"><Ic id="i-bolt" /><span id="hAmmo">0</span></div>
        <div className="pill mini clock" aria-label="Time of day"><svg id="hClockIcon"><use href="#i-sun" /></svg><span id="hClock">Day</span></div>
        <div className="pill mini view"><span id="hView">Chase view</span></div>
      </div>
      <div id="badge" hidden>Oncoming lane &times;2</div>
      <div id="toast" role="status" aria-live="polite" />
    </div>
  );
}
