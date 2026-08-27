import { useState } from 'react';
import { getHistory } from '../api/counterClient';

// Replaces the jQuery loadHistory() global: fetched on demand via the API
// client and rendered as a JSX list rather than raw DOM markup, matching
// the previous "<time> - <op> -> <val>" output format.
export default function History() {
  const [entries, setEntries] = useState(null);

  async function handleShowHistory() {
    const data = await getHistory();
    setEntries(data);
  }

  return (
    <div>
      <button type="button" onClick={handleShowHistory}>
        show history
      </button>
      {entries !== null && (
        <div id="hist">
          <b>History:</b>
          <ul>
            {entries.map((entry, index) => (
              <li key={index}>
                {new Date(entry.t).toLocaleTimeString()} - {entry.op} -&gt; {entry.val}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
