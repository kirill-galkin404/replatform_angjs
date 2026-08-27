// Surfaces a structured client error ({message, code, field}) instead of
// silently discarding it. Renders nothing when there is no error.
export default function ErrorBanner({ error }) {
  if (!error) {
    return null;
  }

  return (
    <div className="error-banner" role="alert">
      <strong>Error:</strong> {error.message}
      {error.code ? ` (${error.code})` : ''}
      {error.field ? ` [field: ${error.field}]` : ''}
    </div>
  );
}
