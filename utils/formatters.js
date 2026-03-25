/**
 * utils/formatters.js – Shared formatting helpers
 *
 * WHY PUT FORMATTERS IN ONE FILE?
 * ─────────────────────────────────────────────────────────────────────────────
 * If you write the same number/date logic in every controller you will:
 *   • Fix bugs in 10 places instead of 1.
 *   • Produce inconsistent output across endpoints.
 * Centralising formatting means one fix = everywhere fixed.
 *
 * TEACHING POINTS COVERED:
 *   • `toLocaleString` for human-friendly numbers
 *   • `toLocaleDateString` and locale/options patterns
 *   • ISO 8601 vs MySQL DATE format
 *   • Default parameter values  (d = new Date())
 *   • Module exports (CommonJS)
 */

/**
 * Format a number with thousands separators and 2 decimal places.
 *
 * HOW IT WORKS:
 *   Number(n)           – converts string "1234567.8" → number 1234567.8
 *   .toLocaleString()   – uses the browser/Node locale to add commas
 *   'en-US'             – locale: English, United States  (comma = thousands, dot = decimal)
 *   minimumFractionDigits: 2  – always show at least 2 decimal places
 *   maximumFractionDigits: 2  – never show more than 2 decimal places
 *
 * @example
 *   formatCurrency(1234567.8)   // → "1,234,567.80"
 *   formatCurrency('500')       // → "500.00"
 *   formatCurrency(0)           // → "0.00"
 *
 * @param {number|string} n  – the numeric value to format
 * @returns {string}
 */
const formatCurrency = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format a Date object or ISO string into a human-readable DD MMM YYYY string.
 *
 * HOW IT WORKS:
 *   new Date(d)          – parses ISO string "2025-03-25T00:00:00.000Z" into a Date object
 *   .toLocaleDateString  – formats the date according to locale + options
 *   'en-GB'              – locale: English, Great Britain  (day first, e.g. 25 Mar 2025)
 *
 * LOCALE DIFFERENCES:
 *   'en-US'  → "Mar 25, 2025"
 *   'en-GB'  → "25 Mar 2025"   ← we use this
 *
 * @example
 *   formatDate('2025-03-25T00:00:00.000Z')  // → "25 Mar 2025"
 *   formatDate(new Date(2025, 0, 1))         // → "01 Jan 2025"
 *
 * @param {Date|string} d
 * @returns {string}
 */
const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Convert a Date or ISO string to a YYYY-MM-DD string for MySQL DATE columns.
 *
 * WHY NEEDED?
 *   JavaScript dates look like: "2025-03-25T08:30:00.000Z"  (ISO 8601 with time + timezone)
 *   MySQL DATE columns expect:  "2025-03-25"                (just the date part)
 *
 *   Passing a full ISO string to MySQL can cause errors or strip the time zone incorrectly.
 *   This function extracts just the YYYY-MM-DD portion safely.
 *
 * HOW IT WORKS:
 *   new Date(d)           – creates a Date object (works with strings and Date objects)
 *   .toISOString()        – converts to UTC ISO 8601: "2025-03-25T08:30:00.000Z"
 *   .slice(0, 10)         – takes the first 10 characters: "2025-03-25"
 *
 * DEFAULT PARAMETER:
 *   d = new Date()        – if no argument is passed, uses today's date
 *   This is ES6 default parameter syntax. The default is evaluated at call time.
 *
 * @example
 *   toMysqlDate('2025-03-25T08:30:00.000Z')  // → "2025-03-25"
 *   toMysqlDate(new Date(2025, 2, 25))        // → "2025-03-25"
 *   toMysqlDate()                             // → today's date, e.g. "2025-07-01"
 *
 * @param {Date|string} d  – defaults to now (current date)
 * @returns {string}       – YYYY-MM-DD
 */
const toMysqlDate = (d = new Date()) =>
    new Date(d).toISOString().slice(0, 10);

// Export all three helpers so any file can import them:
//   const { formatCurrency, formatDate, toMysqlDate } = require('../utils/formatters');
module.exports = { formatCurrency, formatDate, toMysqlDate };
