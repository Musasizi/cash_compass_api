/**
 * utils/response.js – Normalised HTTP response helpers
 * Every controller uses these helpers so response shapes stay consistent.
 */

/** 200 OK with data */
const ok = (res, data, message = 'Success') =>
    res.json({ success: true, message, data });

/** 201 Created */
const created = (res, data, message = 'Created successfully') =>
    res.status(201).json({ success: true, message, data });

/** 400 Bad Request (validation errors) */
const badRequest = (res, message, details = null) =>
    res.status(400).json({ success: false, message, ...(details && { details }) });

/** 404 Not Found */
const notFound = (res, message = 'Resource not found') =>
    res.status(404).json({ success: false, message });

/** 500 Internal Server Error */
const serverError = (res, err) => {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
};

module.exports = { ok, created, badRequest, notFound, serverError };
