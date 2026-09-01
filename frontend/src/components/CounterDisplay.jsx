function CounterDisplay({ count }) {
  return (
    <div id="big" className={count < 0 ? 'neg' : undefined}>
      {count}
    </div>
  );
}

export default CounterDisplay;
