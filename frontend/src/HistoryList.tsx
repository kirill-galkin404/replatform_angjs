import type { HistoryEntry } from './api/types';

export default function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <div id="hist">
      <b>History:</b>
      <ul>
        {entries.map((entry, i) => (
          <li key={i}>
            {new Date(entry.t).toLocaleTimeString()} - {entry.op} -&gt; {entry.val}
          </li>
        ))}
      </ul>
    </div>
  );
}
