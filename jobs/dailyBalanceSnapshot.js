/**
 * jobs/dailyBalanceSnapshot.js
 *
 * Runs at midnight every day.
 * Inserts a new balance row with snapshot_type = 'daily' so the
 * dashboard can show a historical trend chart.
 */
const cron = require('node-cron');
const { recalculateBalance } = require('../services/balanceService');
const Balance = require('../models/balanceModel');

// '0 0 * * *' → at 00:00 every day
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('[cron] Running daily balance snapshot…');
        const { amount_balance, total_income, total_expense } = await recalculateBalance();
        await Balance.insertDailySnapshot(amount_balance, total_income, total_expense);
        console.log(`[cron] Snapshot recorded: balance=${amount_balance}`);
    } catch (err) {
        console.error('[cron] Daily snapshot failed:', err.message);
    }
});

console.log('[cron] Daily balance snapshot job registered (runs at midnight)');
