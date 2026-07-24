/**
 * Module-level singleton that holds the current Firebase ID token.
 *
 * AuthContext updates the cached token from `onIdTokenChanged`, and also
 * registers Firebase's live `getIdToken` provider. The API client invokes
 * `getAuthToken` before every request, so requests never race the async
 * Firebase auth callback and Firebase can refresh an expired token.
 */
let _token: string | null = null;
type AuthTokenProvider = () => Promise<string | null> | string | null;
let _provider: AuthTokenProvider | null = null;

export const getStoredToken = (): string | null => _token;

export const setStoredToken = (token: string | null): void => {
  _token = token;
};

export const setStoredTokenProvider = (
  provider: AuthTokenProvider | null,
): void => {
  _provider = provider;
};

export const getAuthToken = async (): Promise<string | null> => {
  const token = _provider ? await _provider() : _token;
  _token = token;
  return token;
};
