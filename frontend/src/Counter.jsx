import React, { useEffect, useState } from 'react';
import * as api from './api.js';

export function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let active = true;
    api.getCount().then((data) => {
      if (active) setCount(data.count);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (promise) => promise.then((data) => setCount(data.count));

  const onInc = () => update(api.inc(step));
  const onDec = () => update(api.dec());
  const onReset = () => {
    if (window.confirm('sure?')) {
      update(api.reset());
    }
  };
  const onHistory = () => {
    api.getHistory().then((data) => setHistory(data));
  };

  return (
    <>
      <div id="big" className={count < 0 ? 'neg' : undefined}>{count}</div>

      <div>
        <button onClick={onDec}>-</button>
        <input
          type="text"
          className="step"
          aria-label="step"
          value={step}
          onChange={(e) => setStep(e.target.value)}
        />
        <button onClick={onInc}>+</button>
      </div>

      <div>
        <button onClick={onReset}>reset</button>
        <button onClick={onHistory}>show history</button>
      </div>

      <div id="hist">
        {history && (
          <>
            <b>History:</b>
            <ul>
              {history.map((h, i) => (
                <li key={i}>
                  {`${new Date(h.t).toLocaleTimeString()} - ${h.op} -> ${h.val}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

export default Counter;
