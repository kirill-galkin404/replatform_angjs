import { useEffect, useState } from 'react';
import { getCount } from './api/counterClient';
import CounterControls from './components/CounterControls.jsx';
import ResetConfirmation from './components/ResetConfirmation.jsx';
import History from './components/History.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';

export default function App() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCount()
      .then((data) => setCount(data.count))
      .catch((err) => setError(err));
  }, []);

  return (
    <div>
      <div id="big" className={count < 0 ? 'neg' : ''}>
        {count}
      </div>

      <CounterControls onCountChange={setCount} onError={setError} />

      <div>
        <ResetConfirmation onCountChange={setCount} onError={setError} />
      </div>

      <ErrorBanner error={error} />

      <History onError={setError} />
    </div>
  );
}
