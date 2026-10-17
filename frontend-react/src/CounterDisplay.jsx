import { useEffect, useRef } from 'react';
import { getCount } from './api';

// Fetches the current count on mount (replacing app.js's initial
// `$http.get(API + '/count')`) and renders it. Once loaded, further updates
// come from the parent via the `count` prop as inc/dec/reset resolve.
export default function CounterDisplay({ count, onLoaded, onError }) {
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    getCount()
      .then((data) => onLoaded(data.count))
      .catch((err) => onError(err));
  }, [onLoaded, onError]);

  return (
    <div id="big" className={count < 0 ? 'neg' : ''}>
      {count}
    </div>
  );
}
