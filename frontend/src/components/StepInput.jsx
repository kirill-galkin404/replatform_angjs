function StepInput({ step, onChange }) {
  return (
    <input
      type="text"
      value={step}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '40px' }}
    />
  );
}

export default StepInput;
