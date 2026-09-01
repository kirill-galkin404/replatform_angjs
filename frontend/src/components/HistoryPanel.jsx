import { useState } from 'react';
import * as api from '../api.js';

function HistoryPanel() {
  const [history, setHistory] = useState(null);

  function handleShowHistory() {
    api.getHistory().then(setHistory);
  }

  return (
    <div>
      <button onClick={handleShowHistory}>show history</button>
      <div id="hist">
        {history && (
          <>
            <b>History:</b>
            <ul>
              {history.map((entry, i) => (
                <li key={i}>
                  {new Date(entry.t).toLocaleTimeString()} - {entry.op} -&gt; {entry.val}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default HistoryPanel;
