import FariyaName from './FariyaName.jsx';

export default function Welcome() {
  return (
    <div id="welcome" hidden aria-live="polite">
      <p className="w1">Welcome</p>
      <p className="w2" aria-label="Fariya">
        <FariyaName size="clamp(3.2rem, 15vw, 7.5rem)" delay={0.15} />
      </p>
      <p className="w3">This game was made just for you.<br />You are very special.</p>
    </div>
  );
}
