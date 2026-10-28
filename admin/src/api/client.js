// The admin talks to the API over HTTP and nothing else. Every refusal comes out as an ApiError with the same few fields, whatever shape the API gave it:
//   {"detail": {"code": ..., "message": ..., "field": ...}}  (the admin routes)   {"detail": "text"}  (login, 401, 429)   {"detail": [{"loc": ..., "msg": ...}]}  (a malformed request)

export class ApiError extends Error {
  constructor(status, body) {
    const detail = body && typeof body === 'object' ? body.detail : undefined
    let code = 'error'
    let message = 'Something went wrong. Try again.'
    let field
    let extra = {}
    if (status === 0) {
      code = 'network'
      message = 'The server cannot be reached. Check your connection and try again.'
    } else if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      code = detail.code ?? code
      message = detail.message ?? message
      field = detail.field
      extra = detail
    } else if (typeof detail === 'string') {
      message = detail
      code = status === 401 ? 'unauthorized' : status === 429 ? 'locked' : code
    } else if (Array.isArray(detail) && detail.length) {
      code = 'validation'
      message = detail[0].msg ?? message
      field = detail[0].loc?.[detail[0].loc.length - 1]
    } else if (status === 503) {
      code = 'unavailable'
      message = 'The server is not available right now. Try again in a moment.'
    }
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
    this.detail = extra
  }
}

// Told when a request that needed a login is refused with 401: the login ended (the AuthProvider then sends the user to the login page).
let onUnauthorized = null
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler
}

async function request(method, path, { json, form, quiet401 = false } = {}) {
  const init = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } }
  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(json)
  } else if (form) {
    init.body = form // the browser sets the multipart boundary itself
  }
  let response
  try {
    response = await fetch(path, init)
  } catch {
    throw new ApiError(0)
  }
  if (response.status === 204) return null
  let body = null
  try {
    body = await response.json()
  } catch {
    // not JSON: the error below falls back to its general message
  }
  if (!response.ok) {
    if (response.status === 401 && !quiet401 && onUnauthorized) onUnauthorized()
    throw new ApiError(response.status, body)
  }
  return body
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, json, options) => request('POST', path, { ...options, json }),
  patch: (path, json, options) => request('PATCH', path, { ...options, json }),
  put: (path, json, options) => request('PUT', path, { ...options, json }),
  postForm: (path, form, options) => request('POST', path, { ...options, form }),
  patchForm: (path, form, options) => request('PATCH', path, { ...options, form }),
  delete: (path, options) => request('DELETE', path, options),
}
