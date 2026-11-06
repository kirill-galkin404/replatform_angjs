import React, { useEffect, useState } from 'react';
import { getCount, inc, dec, reset, getHistory } from './api.js';
import History from './History.jsx';

export default function App() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [history, setHistory] = useState(null);

  // run an API call; on success replace count, on failure log and leave it
  const apply = async (call) => {
    try {
      const data = await call();
      setCount(data.count);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    apply(getCount);
  }, []);

  const onReset = () => {
    if (window.confirm('sure?')) apply(reset);
  };

  const showHistory = async () => {
    try {
      setHistory(await getHistory());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div id="big" className={count < 0 ? 'neg' : undefined}>{count}</div>

      <div>
        <button onClick={() => apply(dec)}>-</button>
        <input
          type="text"
          aria-label="step"
          style={{ width: '40px' }}
          value={step}
          onChange={(e) => setStep(e.target.value)}
        />
        <button onClick={() => apply(() => inc(step))}>+</button>
      </div>

      <div>
        <button onClick={onReset}>reset</button>
        <button onClick={showHistory}>show history</button>
      </div>

      <div id="hist"><History entries={history} /></div>
    </>
  );
}
