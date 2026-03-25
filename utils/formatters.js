/**
 * utils/formatters.js – Shared formatting helpers
 */

/**
 * Format a number with commas and 2 decimal places.
 * e.g.  1234567.8 → "1,234,567.80"
 * @param {number|string} n
 * @returns {string}
 */
const formatCurrency = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format a Date/ISO string to DD MMM YYYY.
 * e.g. "2025-03-25T00:00:00.000Z" → "25 Mar 2025"
 * @param {Date|string} d
 * @returns {string}
 */
const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Return a YYYY-MM-DD string for MySQL DATE columns.
 * @param {Date|string} d  defaults to now
 * @returns {string}
 */
const toMysqlDate = (d = new Date()) =>
    new Date(d).toISOString().slice(0, 10);

module.exports = { formatCurrency, formatDate, toMysqlDate };
