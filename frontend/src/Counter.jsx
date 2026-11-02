import React, { useEffect, useState } from 'react';
import { getCount, inc, dec, reset } from './api.js';

export default function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState('1');

  // Failures are ignored silently, as the old client did.
  const apply = (promise) =>
    promise.then(
      (data) => setCount(data.count),
      () => {}
    );

  useEffect(() => {
    let active = true;
    getCount().then(
      (data) => {
        if (active) setCount(data.count);
      },
      () => {}
    );
    return () => {
      active = false;
    };
  }, []);

  const handleInc = () => apply(inc(step));
  const handleDec = () => apply(dec());
  const handleReset = () => {
    if (window.confirm('sure?')) {
      apply(reset());
    }
  };

  return (
    <>
      <div id="big" className={count < 0 ? 'neg' : undefined}>{count}</div>

      <div>
        <button onClick={handleDec}>-</button>
        <input
          type="text"
          value={step}
          onChange={(e) => setStep(e.target.value)}
          style={{ width: '40px' }}
        />
        <button onClick={handleInc}>+</button>
      </div>

      <div className="inline-row">
        <button onClick={handleReset}>reset</button>
      </div>
    </>
  );
}
