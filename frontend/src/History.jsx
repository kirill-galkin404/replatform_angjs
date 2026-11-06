import React from 'react';

export default function History({ entries }) {
  if (!entries) return null;
  return (
    <>
      <b>History:</b>
      <ul>
        {entries.map((e, i) => (
          <li key={i}>
            {`${new Date(e.t).toLocaleTimeString()} - ${e.op} -> ${e.val}`}
          </li>
        ))}
      </ul>
    </>
  );
}
