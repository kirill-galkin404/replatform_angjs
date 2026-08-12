// Env handling: a missing/unset API base URL must surface as an explicit,
// visible configuration error (see Root.tsx), not the old silent fallback
// to http://localhost:4000 that frontend/build.sh used to produce.
export class ConfigError extends Error {}

export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new ConfigError(
      'VITE_API_BASE_URL is not set. Configure it (e.g. in a .env file, or ' +
        'in your deployment environment) before running the app.'
    );
  }
  return url;
}
