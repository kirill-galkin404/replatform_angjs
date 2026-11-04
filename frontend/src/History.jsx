import React, { useState } from 'react';
import * as api from './api.js';

export default function History({ onError }) {
  const [entries, setEntries] = useState(null);

  async function load() {
    try {
      const data = await api.getHistory();
      setEntries(data);
      onError('');
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <>
      <div>
        <button onClick={load}>show history</button>
      </div>

      <div id="hist">
        {entries && (
          <>
            <b>History:</b>
            <ul>
              {entries.map((entry, i) => (
                <li key={i}>
                  {new Date(entry.t).toLocaleTimeString()} - {entry.op} -&gt; {String(entry.val)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
