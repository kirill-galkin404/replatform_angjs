import { useState } from 'react';
import { increment, decrement } from '../api/counterClient';

// Mirrors the original layout: a decrement button, a step input, an
// increment button. Both increment and decrement send the current
// numeric step value (D-0004: dec() now honors the step input too).
export default function CounterControls({ onCountChange, onError }) {
  const [step, setStep] = useState(1);

  const numericStep = Number(step);

  async function handleIncrement() {
    try {
      const data = await increment(numericStep);
      onCountChange(data.count);
      onError(null);
    } catch (err) {
      onError(err);
    }
  }

  async function handleDecrement() {
    try {
      const data = await decrement(numericStep);
      onCountChange(data.count);
      onError(null);
    } catch (err) {
      onError(err);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleDecrement}>
        -
      </button>
      <input
        type="text"
        value={step}
        onChange={(e) => setStep(e.target.value)}
        style={{ width: 40 }}
      />
      <button type="button" onClick={handleIncrement}>
        +
      </button>
    </div>
  );
}
