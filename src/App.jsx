import { useEffect } from 'react';
import Icons from './components/Icons.jsx';
import Cockpit from './components/Cockpit.jsx';
import Hud from './components/Hud.jsx';
import Touch from './components/Touch.jsx';
import Menu from './components/Menu.jsx';
import { Pause, GameOver } from './components/Screens.jsx';
import Welcome from './components/Welcome.jsx';
import Intro from './components/Intro.jsx';

let booted = false;

export default function App() {
  useEffect(() => {
    if (booted) return; // React StrictMode runs effects twice in dev
    booted = true;
    import('./engine/index.js');
  }, []);

  return (
    <>
      <Icons />
      <div id="app">
        <canvas id="gl" aria-label="3D motorway driving scene" />
        <div id="nogl" hidden>
          <h2>This game needs WebGL</h2>
          <p>Your browser could not start 3D graphics. Please try an up-to-date Chrome, Edge, Safari or Firefox.</p>
        </div>
        <Cockpit />
        <Hud />
        <Touch />
        <Menu />
        <Pause />
        <GameOver />
        <Welcome />
        <Intro />
      </div>
    </>
  );
}
