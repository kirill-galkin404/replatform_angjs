import React, { useState } from 'react';
import { getHistory } from './api.js';

export default function History() {
  const [entries, setEntries] = useState(null);

  // On demand only; a failed request leaves the current state untouched.
  const handleShow = () =>
    getHistory().then(
      (data) => setEntries(data),
      () => {}
    );

  return (
    <>
      <div>
        <button onClick={handleShow}>show history</button>
      </div>

      <div id="hist">
        {entries && (
          <>
            <b>History:</b>
            <ul>
              {entries.map((e, i) => (
                <li key={i}>
                  {new Date(e.t).toLocaleTimeString() + ' - ' + e.op + ' -> ' + e.val}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
