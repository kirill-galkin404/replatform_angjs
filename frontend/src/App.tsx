import { useEffect, useState } from 'react';
import * as api from './api/client';
import type { HistoryEntry } from './api/types';
import HistoryList from './HistoryList';
import './App.css';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function App() {
  const [count, setCount] = useState(0);
  // Kept as number | string (not eagerly coerced) so, like the original
  // AngularJS ng-model on a plain text input, invalid input is forwarded
  // to the backend as-is for a proper 400 instead of silently degrading
  // via Number('abc') -> NaN -> JSON.stringify -> null -> "absent".
  const [step, setStep] = useState<number | string>(1);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCount()
      .then((data) => {
        setError(null);
        setCount(data.count);
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  async function handleInc() {
    setError(null);
    try {
      const data = await api.inc(step);
      setCount(data.count);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  async function handleDec() {
    setError(null);
    try {
      // The step field only ever affects increment, matching the original
      // AngularJS app's $scope.dec, which always posted an empty body.
      const data = await api.dec();
      setCount(data.count);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  async function handleReset() {
    if (!window.confirm('sure?')) {
      return;
    }
    setError(null);
    try {
      const data = await api.reset();
      setCount(data.count);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  async function handleShowHistory() {
    setError(null);
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <div id="big" className={count < 0 ? 'neg' : undefined} data-testid="count">
        {count}
      </div>

      <div>
        <button onClick={handleDec}>-</button>
        <input
          type="text"
          value={step}
          onChange={(e) => setStep(e.target.value)}
          style={{ width: 40 }}
        />
        <button onClick={handleInc}>+</button>
      </div>

      <div>
        <button onClick={handleReset}>reset</button>
        <button onClick={handleShowHistory}>show history</button>
      </div>

      {error && <div role="alert">{error}</div>}

      {history && <HistoryList entries={history} />}
    </div>
  );
}
