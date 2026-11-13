const Pad = ({ id, cls = '', label, icon }) => (
  <button type="button" className={`pad ${cls}`.trim()} id={id} aria-label={label}><svg><use href={`#${icon}`} /></svg></button>
);
export default function Touch() {
  return (
    <div id="touch" hidden>
      <div className="cluster steer">
        <Pad id="tLeft" label="Steer left" icon="i-left" />
        <Pad id="tRight" label="Steer right" icon="i-right" />
      </div>
      <div className="cluster pedals">
        <div className="row">
          <Pad id="tHorn" cls="small" label="Horn" icon="i-horn" />
          <Pad id="tFire" cls="small fire" label="Shoot" icon="i-fire" />
        </div>
        <div className="row">
          <Pad id="tBrake" cls="brake" label="Brake" icon="i-brake" />
          <Pad id="tGas" cls="tall" label="Gas" icon="i-gas" />
        </div>
      </div>
    </div>
  );
}
