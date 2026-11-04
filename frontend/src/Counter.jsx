import React, { useEffect, useState } from 'react';
import * as api from './api.js';
import History from './History.jsx';

export default function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState('1');
  const [error, setError] = useState('');

  async function run(call) {
    try {
      const data = await call();
      setCount(data.count);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    let active = true;
    api
      .getCount()
      .then((data) => {
        if (active) {
          setCount(data.count);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleReset() {
    if (window.confirm('sure?')) {
      run(() => api.reset());
    }
  }

  return (
    <>
      {error && <div role="alert">{error}</div>}

      <div id="big" className={count < 0 ? 'neg' : undefined}>
        {count}
      </div>

      <div>
        <button onClick={() => run(() => api.dec())}>-</button>
        <input
          type="text"
          value={step}
          onChange={(e) => setStep(e.target.value)}
          style={{ width: '40px' }}
        />
        <button onClick={() => run(() => api.inc(step))}>+</button>
      </div>

      <div>
        <button onClick={handleReset}>reset</button>
      </div>

      <History onError={setError} />
    </>
  );
}
