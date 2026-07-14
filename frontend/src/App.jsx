import { useCounter } from './state/useCounter.js';
import CounterControls from './components/CounterControls.jsx';
import HistoryList from './components/HistoryList.jsx';

function App() {
  const { count, step, history, setStep, inc, dec, reset, fetchHistory } = useCounter();

  return (
    <div>
      <CounterControls count={count} step={step} setStep={setStep} inc={inc} dec={dec} reset={reset} />
      <HistoryList history={history} fetchHistory={fetchHistory} />
    </div>
  );
}

export default App;
