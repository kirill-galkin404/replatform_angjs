import { useState } from 'react';
import { reset } from '../api/counterClient';

// Reset gating uses in-component confirmation state (D-0005) instead of a
// blocking native confirm dialog: clicking "reset" arms a pending
// confirmation, and counterClient.reset() is only called once the user
// explicitly confirms.
export default function ResetConfirmation({ onCountChange, onError }) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    try {
      const data = await reset();
      onCountChange(data.count);
      onError(null);
    } catch (err) {
      onError(err);
    } finally {
      setPending(false);
    }
  }

  if (pending) {
    return (
      <span>
        sure?{' '}
        <button type="button" onClick={handleConfirm}>
          yes
        </button>
        <button type="button" onClick={() => setPending(false)}>
          cancel
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setPending(true)}>
      reset
    </button>
  );
}
