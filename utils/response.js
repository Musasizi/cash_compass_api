/**
 * utils/response.js – Normalised HTTP response helpers
 *
 * KEY CONCEPT – Why do we need response helpers?
 *
 * Without helpers, every controller would write its own response format:
 *
 *   res.status(200).json({ data: rows, ok: true });        // controller A
 *   res.status(200).json({ result: rows, status: 'ok' });  // controller B  ← inconsistent!
 *
 * A client (e.g. the React frontend) then has to handle two different shapes.
 * By centralising responses here, every endpoint in the whole API returns the
 * SAME structure:
 *
 *   { success: true/false, message: "...", data: ... }
 *
 * If we ever need to change the shape (e.g. add a "meta" field for pagination),
 * we only change it in THIS file — not in 20 different controllers.
 *
 * HTTP STATUS CODE CHEAT SHEET:
 *   200 OK          – request succeeded, data returned
 *   201 Created     – a new resource was successfully created
 *   400 Bad Request – the client sent invalid data (our fault to tell them)
 *   401 Unauthorized – no/invalid token (not authenticated)
 *   403 Forbidden   – authenticated but not allowed to do this
 *   404 Not Found   – the requested resource doesn't exist
 *   500 Internal Server Error – something broke on our side
 */

/**
 * 200 OK — used for successful GET, PUT, DELETE responses.
 *
 * @example
 *   return ok(res, rows, 'Income records retrieved');
 *   // → { "success": true, "message": "Income records retrieved", "data": [...] }
 */
const ok = (res, data, message = 'Success') =>
    res.json({ success: true, message, data });

/**
 * 201 Created — used after a successful POST (new resource created).
 *
 * @example
 *   return created(res, { insertId: 5 }, 'Income recorded');
 *   // → HTTP 201  { "success": true, "message": "Income recorded", "data": { insertId: 5 } }
 */
const created = (res, data, message = 'Created successfully') =>
    res.status(201).json({ success: true, message, data });

/**
 * 400 Bad Request — used when the client's input fails validation.
 * The optional `details` array provides field-level error messages from Joi.
 *
 * @example
 *   return badRequest(res, 'Validation failed', ['amount is required', 'date is invalid']);
 *   // → HTTP 400  { "success": false, "message": "Validation failed", "details": [...] }
 */
const badRequest = (res, message, details = null) =>
    res.status(400).json({ success: false, message, ...(details && { details }) });

/**
 * 404 Not Found — used when we look up a record by ID and it doesn't exist.
 *
 * @example
 *   if (!record) return notFound(res, 'Income record not found');
 */
const notFound = (res, message = 'Resource not found') =>
    res.status(404).json({ success: false, message });

/**
 * 500 Internal Server Error — used in catch blocks for unexpected errors.
 * Logs the full error to the server console (so developers can debug),
 * but only sends a safe message to the client (never expose stack traces!).
 *
 * @example
 *   try { ... }
 *   catch (err) { return serverError(res, err); }
 */
const serverError = (res, err) => {
    // Log the full error on the server side for debugging
    console.error('[serverError]', err);
    // Send a safe, minimal message to the client
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
};

module.exports = { ok, created, badRequest, notFound, serverError };
