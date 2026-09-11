import React from 'react';
import ReactDOM from 'react-dom/client';

// Placeholder root: the real Counter/History/App components are scaffolded
// in later steps of this Plan and will replace this inline component.
function App() {
  return <p>Loading...</p>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
