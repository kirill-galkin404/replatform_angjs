import { useState } from 'react';

// Only allow digits and an optional leading minus sign while typing, closing
// off the free-text ng-model="step" NaN risk that fed straight into /inc.
function isNumericInput(value) {
  return /^-?\d*$/.test(value);
}

export default function CounterControls({ count, step, setStep, inc, dec, reset }) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleStepChange(e) {
    const value = e.target.value;
    if (isNumericInput(value)) {
      setStep(value === '' || value === '-' ? value : Number(value));
    }
  }

  function handleResetClick() {
    setConfirmingReset(true);
  }

  function handleConfirmReset() {
    setConfirmingReset(false);
    reset();
  }

  function handleCancelReset() {
    setConfirmingReset(false);
  }

  return (
    <>
      <div id="big" className={count < 0 ? 'neg' : ''}>
        {count}
      </div>

      <div>
        <button onClick={dec}>-</button>
        <input
          type="text"
          inputMode="numeric"
          value={step}
          onChange={handleStepChange}
          style={{ width: 40 }}
        />
        <button onClick={inc}>+</button>
      </div>

      <p className="note">
        Note: decrement always applies -1 on the server regardless of the
        step value, until backend/server.js's /dec route is updated to read
        the request body.
      </p>

      <div>
        {!confirmingReset && <button onClick={handleResetClick}>reset</button>}
        {confirmingReset && (
          <div className="confirm-box">
            <p>Reset count to 0?</p>
            <button onClick={handleConfirmReset}>confirm reset</button>
            <button onClick={handleCancelReset}>cancel</button>
          </div>
        )}
      </div>
    </>
  );
}
