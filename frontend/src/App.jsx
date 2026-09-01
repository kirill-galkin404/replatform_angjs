import { useState, useEffect } from 'react';
import * as api from './api.js';
import CounterDisplay from './components/CounterDisplay.jsx';
import StepInput from './components/StepInput.jsx';
import ActionButtons from './components/ActionButtons.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';

function App() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCount().then(
      (data) => setCount(data.count),
      (err) => setError(err)
    );
  }, []);

  function handleCount(newCount) {
    setError(null);
    setCount(newCount);
  }

  return (
    <div>
      <CounterDisplay count={count} />

      <div>
        <StepInput step={step} onChange={setStep} />
        <ActionButtons step={step} onCount={handleCount} onError={setError} />
      </div>

      {error && (
        <div className="error">
          {error.error}
          {error.field ? ' (' + error.field + ')' : ''}
        </div>
      )}

      <HistoryPanel onError={setError} />
    </div>
  );
}

export default App;
