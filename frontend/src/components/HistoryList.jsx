export default function HistoryList({ history, fetchHistory }) {
  return (
    <div>
      <button onClick={fetchHistory}>show history</button>
      <div id="hist">
        {history.length > 0 && (
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
