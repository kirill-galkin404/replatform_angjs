import App from './App';
import { ConfigError, getApiBaseUrl } from './config';

// Fails loudly and visibly if the API base URL isn't configured, instead of
// the old frontend/build.sh behaviour of silently falling back to
// http://localhost:4000 when API_BASE_URL was unset.
export default function Root() {
  try {
    getApiBaseUrl();
  } catch (e) {
    if (e instanceof ConfigError) {
      return (
        <div data-testid="config-error" role="alert">
          <h1>Configuration error</h1>
          <p>{e.message}</p>
        </div>
      );
    }
    throw e;
  }

  return <App />;
}
