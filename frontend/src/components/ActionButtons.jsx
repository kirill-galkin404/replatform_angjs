import * as api from '../api.js';

function ActionButtons({ step, onCount, onError }) {
  function handleInc() {
    api.inc(step).then(
      (data) => onCount(data.count),
      (err) => onError(err)
    );
  }

  function handleDec() {
    api.dec().then(
      (data) => onCount(data.count),
      (err) => onError(err)
    );
  }

  function handleReset() {
    if (window.confirm('sure?')) {
      api.reset().then(
        (data) => onCount(data.count),
        (err) => onError(err)
      );
    }
  }

  return (
    <div>
      <button onClick={handleDec}>-</button>
      <button onClick={handleInc}>+</button>
      <button onClick={handleReset}>reset</button>
    </div>
  );
}

export default ActionButtons;
