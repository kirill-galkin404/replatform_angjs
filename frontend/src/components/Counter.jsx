import { useEffect, useRef, useState } from 'react';
import api from '../api';

export default function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // run a request and set count from its response; a failed request leaves count unchanged
  const apply = (request) =>
    request
      .then((data) => {
        if (mounted.current) setCount(data.count);
      })
      .catch(() => {});

  useEffect(() => {
    apply(api.getCount());
  }, []);

  const inc = () => apply(api.inc(step));
  const dec = () => apply(api.dec());
  const reset = () => {
    if (window.confirm('sure?')) {
      apply(api.reset());
    }
  };

  return (
    <>
      <div id="big" className={count < 0 ? 'neg' : ''}>{count}</div>

      <div>
        <button onClick={dec}>-</button>
        <input
          type="text"
          value={step}
          onChange={(e) => setStep(e.target.value)}
          style={{ width: '40px' }}
        />
        <button onClick={inc}>+</button>
      </div>

      <button onClick={reset}>reset</button>
    </>
  );
}
