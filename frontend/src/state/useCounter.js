import { useEffect, useReducer, useCallback } from 'react';
import { getCount, postInc, postDec, postReset, getHistory } from '../api.js';

const initialState = {
  count: 0,
  step: 1,
  history: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_COUNT':
      return { ...state, count: action.count };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    default:
      return state;
  }
}

// Single store owning count/step/history, shared by every component that
// needs the counter's state instead of each one keeping its own copy.
export function useCounter() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getCount().then((data) => dispatch({ type: 'SET_COUNT', count: data.count }));
  }, []);

  const setStep = useCallback((step) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const inc = useCallback(async () => {
    const data = await postInc(state.step);
    dispatch({ type: 'SET_COUNT', count: data.count });
  }, [state.step]);

  const dec = useCallback(async () => {
    // Sent for parity with inc()'s {by: step}. NOTE: backend/server.js's
    // /dec route currently ignores the request body and always subtracts 1,
    // regardless of `step` — see the note in CounterControls.
    const data = await postDec(state.step);
    dispatch({ type: 'SET_COUNT', count: data.count });
  }, [state.step]);

  const reset = useCallback(async () => {
    const data = await postReset();
    dispatch({ type: 'SET_COUNT', count: data.count });
  }, []);

  const fetchHistory = useCallback(async () => {
    const history = await getHistory();
    dispatch({ type: 'SET_HISTORY', history });
  }, []);

  return {
    count: state.count,
    step: state.step,
    history: state.history,
    setStep,
    inc,
    dec,
    reset,
    fetchHistory,
  };
}
