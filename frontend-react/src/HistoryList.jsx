import { useState } from 'react';
import { getHistory } from './api';

// Replaces app.js's loadHistory(): fetches GET /history via api.js and
// renders each {t, op, val} entry as a real React <li>, triggered by a
// normal React click handler instead of a global window.onclick, with no
// innerHTML string concatenation and no jQuery.
export default function HistoryList({ onError }) {
  const [history, setHistory] = useState(null);

  function handleShow() {
    getHistory()
      .then((data) => setHistory(data))
      .catch((err) => onError(err));
  }

  return (
    <div>
      <button type="button" onClick={handleShow}>show history</button>
      {history !== null && (
        <div id="hist">
          <b>History:</b>
          <ul>
            {history.map((entry, i) => (
              <li key={`${entry.t}-${i}`}>
                {new Date(entry.t).toLocaleTimeString()} - {entry.op} -&gt; {entry.val}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
