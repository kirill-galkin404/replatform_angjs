import { useState } from 'react';
import api from '../api';

export default function History() {
  const [entries, setEntries] = useState(null);

  async function loadHistory() {
    try {
      setEntries(await api.history());
    } catch (err) {
      // keep what is shown unchanged
    }
  }

  return (
    <>
      <button onClick={loadHistory}>show history</button>
      <div id="hist">
        {entries && (
          <>
            <b>History:</b>
            <ul>
              {entries.map((e, i) => (
                <li key={i}>{`${new Date(e.t).toLocaleTimeString()} - ${e.op} -> ${e.val}`}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
