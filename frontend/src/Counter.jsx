import { useEffect, useState } from 'react';
import { API_BASE_URL } from './api';

async function parseErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (data && typeof data.error === 'string') return data.error;
    if (data && typeof data.message === 'string') return data.message;
  } catch (e) {
    // response body wasn't JSON (or was empty) - fall through to fallback
  }
  return fallback;
}

export default function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/count`);
        if (!response.ok) {
          const message = await parseErrorMessage(response, 'Failed to load count');
          if (!cancelled) setError(message);
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setCount(data.count);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load count');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInc = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: step }),
      });
      if (!response.ok) {
        setError(await parseErrorMessage(response, 'Failed to increment'));
        return;
      }
      const data = await response.json();
      setCount(data.count);
      setError(null);
    } catch (e) {
      setError('Failed to increment');
    }
  };

  const handleDec = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setError(await parseErrorMessage(response, 'Failed to decrement'));
        return;
      }
      const data = await response.json();
      setCount(data.count);
      setError(null);
    } catch (e) {
      setError('Failed to decrement');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('sure?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setError(await parseErrorMessage(response, 'Failed to reset'));
        return;
      }
      const data = await response.json();
      setCount(data.count);
      setError(null);
    } catch (e) {
      setError('Failed to reset');
    }
  };

  return (
    <div>
      <div id="big" className={count < 0 ? 'neg' : ''} style={count < 0 ? { color: 'red' } : undefined}>
        {count}
      </div>
      <button onClick={handleDec}>-</button>
      <input value={step} onChange={(e) => setStep(e.target.value)} />
      <button onClick={handleInc}>+</button>
      <button onClick={handleReset}>reset</button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
