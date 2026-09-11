import { useState } from 'react';
import { API_BASE_URL } from './api';

export default function History() {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/history`);
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();
      setEntries(data);
      setError(null);
      setVisible(true);
    } catch (err) {
      setError('Failed to load history');
      setVisible(false);
    }
  };

  return (
    <div>
      <button onClick={loadHistory}>show history</button>
      {error && <p role="alert">{error}</p>}
      {visible && !error && (
        <>
          <b>History:</b>
          <ul>
            {entries.map((e, i) => (
              <li key={`${e.t}-${i}`}>
                {new Date(e.t).toLocaleTimeString()} - {e.op} -&gt; {e.val}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
