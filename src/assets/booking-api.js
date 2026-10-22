/* HTTP client for BOOKING-API-CONTRACT.md. No DOM. */
export async function readJson(response) {
  try {
    if (!response || typeof response.json !== 'function') return null;
    return await response.json();
  } catch (err) {
    return null;
  }
}

export function joinApi(base, path) {
  const root = String(base || '').replace(/\/$/, '');
  const tail = path.startsWith('/') ? path : `/${path}`;
  return `${root}${tail}`;
}

export function createClient({ base, fetchImpl, token } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  async function request(method, path, opts = {}) {
    const { query, body, auth } = opts;
    const bearer = opts.token || token;
    if (!base) return { ok: false, status: 0, error: 'no_backend', data: null };
    let url = joinApi(base, path);
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value != null && value !== '') params.set(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (auth && bearer) headers.Authorization = `Bearer ${bearer}`;
    let response;
    try {
      response = await doFetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (err) {
      return { ok: false, status: 0, error: 'network', data: null };
    }
    const data = await readJson(response);
    const success = !!(response && response.ok && data && data.ok === true);
    return {
      ok: success,
      status: response ? response.status : 0,
      error: (data && data.error) || (success ? '' : 'bad_response'),
      data,
    };
  }

  return {
    request,
    availability() { return request('GET', '/availability'); },
    book(body) { return request('POST', '/bookings', { body }); },
    fleetLogin(body) { return request('POST', '/fleet/login', { body }); },
    fleetWindows(authToken) { return request('GET', '/fleet/windows', { auth: true, token: authToken }); },
    fleetBook(authToken, body) { return request('POST', '/fleet/bookings', { auth: true, body, token: authToken }); },
    rescheduleGet(t) { return request('GET', '/reschedule', { query: { t } }); },
    reschedulePost(body) { return request('POST', '/reschedule', { body }); },
  };
}

export async function postJson(url, body, fetchImpl) {
  const doFetch = fetchImpl || globalThis.fetch;
  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await readJson(response);
    return { ok: !!(response && response.ok && data && data.ok === true), status: response ? response.status : 0, data };
  } catch (err) {
    return { ok: false, status: 0, data: null };
  }
}
