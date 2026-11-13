import FariyaName from './FariyaName.jsx';

function Opt({ name, value, title, hint, compact, checked }) {
  return (
    <label className={`opt${compact ? ' compact' : ''}`}>
      <input type="radio" name={name} value={value} defaultChecked={checked} />
      <span><b>{title}</b>{hint && <i>{hint}</i>}</span>
    </label>
  );
}

export default function Menu() {
  return (
    <section id="menu" className="screen" aria-label="Main menu">
      <div className="sheet">
        <p className="eyebrow">Made just for you</p>
        <h1 className="brand" aria-label="Fariya"><FariyaName size="inherit" delay={0.1} /></h1>
        <p className="lead">Welcome, <span className="fname">Fariya</span>. Drive the motorway, dodge the traffic, overtake, and shoot your way to a new best. Every kilometre is yours.</p>

        <fieldset className="group">
          <legend>Camera view</legend>
          <div className="opts three views">
            <Opt name="view" value="top" title="Top view" hint="Simple. The whole road from above." />
            <Opt name="view" value="chase" title="Chase view" hint="Behind the car. The classic." checked />
            <Opt name="view" value="cockpit" title="Cockpit view" hint="Inside the car, behind the wheel." />
          </div>
        </fieldset>

        <fieldset className="group">
          <legend>Your car</legend>
          <div className="opts four">
            <Opt compact name="car" value="coupe" title="Coupe" checked />
            <Opt compact name="car" value="sedan" title="Sedan" />
            <Opt compact name="car" value="hatch" title="Hatchback" />
            <Opt compact name="car" value="suv" title="SUV" />
          </div>
          <div className="swatches" id="swatches" role="group" aria-label="Car colour" />
        </fieldset>

        <fieldset className="group">
          <legend>Top speed</legend>
          <div className="opts three">
            <Opt compact name="speed" value="relaxed" title="Relaxed" hint="100 km/h" />
            <Opt compact name="speed" value="normal" title="Normal" hint="140 km/h" checked />
            <Opt compact name="speed" value="turbo" title="Turbo" hint="180 km/h" />
          </div>
        </fieldset>

        <fieldset className="group touch-only">
          <legend>Touch controls</legend>
          <div className="opts two">
            <Opt compact name="side" value="left" title="Steering on the left" checked />
            <Opt compact name="side" value="right" title="Steering on the right" />
          </div>
          <label className="check"><input type="checkbox" id="autoGas" defaultChecked /><span>Automatic gas (just steer and brake)</span></label>
        </fieldset>

        <button type="button" className="btn primary" id="btnStart">Start driving</button>
        <p className="keys desk-only"><kbd>&larr;</kbd><kbd>&rarr;</kbd> steer <kbd>&uarr;</kbd> gas <kbd>&darr;</kbd> brake <kbd>Space</kbd> shoot <kbd>H</kbd> horn <kbd>C</kbd> view <kbd>P</kbd> pause</p>
        <p className="best">Best score: <b id="mBest">0</b></p>
      </div>
    </section>
  );
}
