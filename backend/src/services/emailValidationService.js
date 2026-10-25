/**
 * Email validation service using emailvalidation.io API
 * https://emailvalidation.io/docs
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates an email address syntax and deliverability.
 * If EMAILVALIDATION_API_KEY is configured in the environment,
 * checks real-time deliverability, MX records, and disposable email status.
 *
 * @param {string} email
 * @returns {Promise<{ valid: boolean, message?: string, details?: any }>}
 */
export async function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email address is required.' }
  }

  const trimmed = email.trim().toLowerCase()

  // 1. Basic syntax check
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address format.' }
  }

  const apiKey = process.env.EMAILVALIDATION_API_KEY?.trim()

  // If API key is not configured, pass basic validation with notice
  if (!apiKey) {
    return {
      valid: true,
      skipped: true,
      reason: 'EMAILVALIDATION_API_KEY not configured, basic format check passed.',
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout

    const url = `https://api.emailvalidation.io/v1/info?email=${encodeURIComponent(trimmed)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.warn('[EmailValidation] Invalid or unauthorized emailvalidation.io API key.')
        // Fail open so users aren't locked out due to configuration error
        return { valid: true, skipped: true, reason: 'Invalid API key' }
      }
      if (res.status === 429) {
        console.warn('[EmailValidation] emailvalidation.io quota / rate limit reached.')
        // Fail open on rate limits
        return { valid: true, skipped: true, reason: 'Rate limit reached' }
      }

      console.warn(`[EmailValidation] API returned HTTP ${res.status}`)
      return { valid: true, skipped: true, reason: `HTTP ${res.status}` }
    }

    const data = await res.json()

    // 2. Format validation from emailvalidation.io
    if (data.format_valid === false) {
      return {
        valid: false,
        message: 'The email address format is invalid.',
        details: data,
      }
    }

    // 3. Block disposable/temporary mailboxes
    if (data.disposable === true) {
      return {
        valid: false,
        message: 'Disposable or temporary email addresses are not permitted. Please use a permanent email address.',
        details: data,
      }
    }

    // 4. Deliverability state
    if (data.state === 'undeliverable') {
      let message = 'This email address appears to be invalid or undeliverable.'
      if (data.did_you_mean) {
        message += ` Did you mean "${data.did_you_mean}"?`
      } else if (data.reason === 'no_mx_records' || data.mx_found === false) {
        message = 'The domain of this email address cannot receive emails (no valid mail server found).'
      }
      return {
        valid: false,
        message,
        details: data,
      }
    }

    // Valid deliverable / risky / catch-all email
    return {
      valid: true,
      details: data,
    }
  } catch (err) {
    // On network failure or abort, log warning and fail open
    console.warn('[EmailValidation] Network error or timeout during email validation:', err.message)
    return {
      valid: true,
      skipped: true,
      reason: err.name === 'AbortError' ? 'Validation request timed out' : err.message,
    }
  }
}
