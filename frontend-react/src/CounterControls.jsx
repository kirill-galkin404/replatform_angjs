import { useState } from 'react';
import { inc, dec, reset } from './api';

// Replaces app.js lines 16-34 (inc/dec/reset on $scope).
export default function CounterControls({ onCountChange, onError }) {
  const [step, setStep] = useState(1);

  function handleInc() {
    inc(step)
      .then((data) => onCountChange(data.count))
      .catch((err) => onError(err));
  }

  function handleDec() {
    // Matches today's live behaviour exactly: app.js line 23 posts /dec with
    // `{}`, not `{by: $scope.step}`, so dec always decrements by 1 and
    // ignores the step field despite it visually being shared with +.
    dec()
      .then((data) => onCountChange(data.count))
      .catch((err) => onError(err));
  }

  function handleReset() {
    if (window.confirm('sure?')) {
      reset()
        .then((data) => onCountChange(data.count))
        .catch((err) => onError(err));
    }
  }

  return (
    <div>
      <button type="button" onClick={handleDec}>-</button>
      <input
        type="text"
        value={step}
        onChange={(e) => setStep(e.target.value)}
        style={{ width: 40 }}
      />
      <button type="button" onClick={handleInc}>+</button>
      <div>
        <button type="button" onClick={handleReset}>reset</button>
      </div>
    </div>
  );
}
