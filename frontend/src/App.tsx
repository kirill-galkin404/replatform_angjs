import { useEffect, useState } from 'react';
import * as api from './api/client';
import type { HistoryEntry } from './api/types';
import HistoryList from './HistoryList';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function App() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCount()
      .then((data) => setCount(data.count))
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  async function handleInc() {
    try {
      const data = await api.inc(step);
      setCount(data.count);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  async function handleDec() {
    try {
      const data = await api.dec(step);
      setCount(data.count);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  async function handleReset() {
    if (!window.confirm('sure?')) {
      return;
    }
    try {
      const data = await api.reset();
      setCount(data.count);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  async function handleShowHistory() {
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
          onChange={(e) => setStep(Number(e.target.value))}
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
