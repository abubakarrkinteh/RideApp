// Email sign-in with Supabase Auth, using its REST endpoints directly.
// The session is kept in this browser so a reload stays signed in.
const STORE_KEY = 'rideapp.session';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {}

function memoryStorage() {
  const data = new Map();
  return {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k)};
}

// Turn Supabase's error replies into short, plain messages.
export function authMessage(body, status) {
  const code = body?.error_code || body?.code || body?.error || '';
  const text = String(body?.msg || body?.message || body?.error_description || '');
  if (code === 'invalid_credentials' || /invalid login/i.test(text)) return 'Email or password is not right.';
  if (code === 'email_not_confirmed' || /not confirmed/i.test(text)) return 'Please confirm your email first. Open the link we sent you, then sign in.';
  if (code === 'user_already_exists' || /already registered/i.test(text)) return 'This email already has an account. Please sign in.';
  if (code === 'weak_password' || /password should be/i.test(text)) return 'Please use a longer password (at least 8 characters).';
  if (code === 'over_email_send_rate_limit' || status === 429) return 'Too many tries. Please wait a few minutes and try again.';
  if (code === 'email_address_not_authorized' || /not authorized/i.test(text)) return 'Test emails can only go to the project team for now. Use your own email.';
  return 'Sign-in did not work. Please try again.';
}

export function createAuth({url, publishableKey}, {fetchFn = globalThis.fetch, storage, now = () => Date.now()} = {}) {
  let store = storage;
  if (!store) {
    try { store = globalThis.localStorage; store.getItem(STORE_KEY); } catch { store = memoryStorage(); }
    store ||= memoryStorage();
  }
  let session = null;
  try { session = JSON.parse(store.getItem(STORE_KEY) || 'null'); } catch { session = null; }
  if (!session?.access_token || !session?.refresh_token) session = null;

  const save = data => {
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at ? data.expires_at * 1000 : now() + (data.expires_in || 3600) * 1000,
      email: data.user?.email || session?.email || ''
    };
    try { store.setItem(STORE_KEY, JSON.stringify(session)); } catch {}
    return session;
  };
  const clear = () => { session = null; try { store.removeItem(STORE_KEY); } catch {} };

  async function call(path, body, token) {
    let response;
    try {
      response = await fetchFn(new URL('/auth/v1/' + path, url), {
        method: 'POST',
        headers: {apikey: publishableKey, 'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})},
        body: JSON.stringify(body || {})
      });
    } catch { throw new AuthError('No connection. Please check your internet and try again.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new AuthError(authMessage(data, response.status));
    return data;
  }

  function checkInput(email, password) {
    if (!EMAIL.test(String(email || '').trim())) throw new AuthError('Please enter a valid email address.');
    if (String(password || '').length < 8) throw new AuthError('Please use a password with at least 8 characters.');
  }

  return {
    get user() { return session ? {email: session.email} : null; },
    async signIn(email, password) {
      checkInput(email, password);
      return save(await call('token?grant_type=password', {email: email.trim(), password}));
    },
    // Returns {signedIn: true} when no email check is needed, else {confirmEmail: true}.
    async signUp(email, password, redirectTo) {
      checkInput(email, password);
      const query = redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : '';
      const data = await call('signup' + query, {email: email.trim(), password});
      if (data.access_token) { save(data); return {signedIn: true}; }
      return {confirmEmail: true};
    },
    async signOut() {
      const token = session?.access_token;
      clear();
      if (token) await call('logout', {}, token).catch(() => {});
    },
    // A valid access token, refreshed when it is about to run out. Null when signed out.
    async accessToken() {
      if (!session) return null;
      if (session.expires_at - now() > 60_000) return session.access_token;
      try { return save(await call('token?grant_type=refresh_token', {refresh_token: session.refresh_token})).access_token; }
      catch (error) { if (/No connection/.test(error.message)) throw error; clear(); return null; }
    },
    // After the email link, Supabase sends the person back with the session in the address (#access_token=...).
    takeSessionFromHash(hash) {
      const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
      if (!params.get('access_token') || !params.get('refresh_token')) return false;
      save({access_token: params.get('access_token'), refresh_token: params.get('refresh_token'), expires_in: Number(params.get('expires_in')) || 3600, user: {email: ''}});
      return true;
    },
    async loadEmail() {
      if (!session || session.email) return;
      const token = await this.accessToken();
      if (!token) return;
      const response = await fetchFn(new URL('/auth/v1/user', url), {headers: {apikey: publishableKey, Authorization: 'Bearer ' + token}}).catch(() => null);
      const user = response?.ok ? await response.json().catch(() => null) : null;
      if (user?.email) { session.email = user.email; try { store.setItem(STORE_KEY, JSON.stringify(session)); } catch {} }
    }
  };
}
