export function Pause() {
  return (
    <section id="pause" className="screen center" hidden aria-label="Paused">
      <div className="card">
        <h2>Paused</h2>
        <p>Take your time, <span className="fname">Fariya</span>. The road will wait.</p>
        <div className="row">
          <button type="button" className="btn primary" id="btnResume">Resume</button>
          <button type="button" className="btn" id="btnRestart">Restart</button>
          <button type="button" className="btn" id="btnMenu">Main menu</button>
        </div>
      </div>
    </section>
  );
}

export function GameOver() {
  return (
    <section id="over" className="screen center" hidden aria-label="Game over">
      <div className="card">
        <h2 id="oTitle">Great drive, <span className="fname">Fariya</span>!</h2>
        <p id="oMsg">You are something special.</p>
        <dl className="stats">
          <div><dt>Score</dt><dd id="oScore">0</dd></div>
          <div><dt>Best</dt><dd id="oBest">0</dd></div>
          <div><dt>Distance</dt><dd id="oDist">0.00 km</dd></div>
          <div><dt>Overtakes</dt><dd id="oOver">0</dd></div>
          <div><dt>Cars shot</dt><dd id="oShot">0</dd></div>
          <div><dt>Close calls</dt><dd id="oNear">0</dd></div>
        </dl>
        <div className="row">
          <button type="button" className="btn primary" id="btnAgain">Drive again</button>
          <button type="button" className="btn" id="btnMenu2">Main menu</button>
        </div>
      </div>
    </section>
  );
}
