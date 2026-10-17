import { useCallback, useState } from 'react';
import CounterDisplay from './CounterDisplay';
import CounterControls from './CounterControls';
import HistoryList from './HistoryList';
import './index.css';

function formatError(err) {
  if (err && err.status >= 500) {
    // Never surface backend error text for 5xx — it could carry internal
    // detail in the future even though today's backend already sanitizes it.
    return 'Something went wrong. Please try again.';
  }
  if (err && err.field) {
    return `${err.message} (field: ${err.field})`;
  }
  return (err && err.message) || 'Something went wrong. Please try again.';
}

export default function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLoaded = useCallback((value) => {
    setCount(value);
    setLoading(false);
    setError(null);
  }, []);

  const handleCountChange = useCallback((value) => {
    setCount(value);
    setError(null);
  }, []);

  const handleError = useCallback((err) => {
    setLoading(false);
    setError(err);
  }, []);

  return (
    <>
      <CounterDisplay count={count} onLoaded={handleLoaded} onError={handleError} />

      {loading && <div>Loading…</div>}
      {error && (
        <div className="error" role="alert">
          {formatError(error)}
        </div>
      )}

      <CounterControls onCountChange={handleCountChange} onError={handleError} />

      <HistoryList onError={handleError} />
    </>
  );
}
