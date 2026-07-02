// ─── PM2 Ecosystem Configuration ─────────────────────────────────────────────
// Usage:
//   pm2 start ecosystem.config.js          # Start API + backup cron
//   pm2 start ecosystem.config.js --only look-immo-api   # API only
//   pm2 save                                # Persist process list across reboots
//   pm2 startup                             # Generate OS init script

module.exports = {
    apps: [
        // ── 1. Main API Server ─────────────────────────────────────────────────
        {
            name:         'look-immo-api',
            script:       'dist/index.js',
            instances:    1,           // Increase to 'max' for multi-core if needed
            exec_mode:    'fork',      // Use 'cluster' with instances > 1
            watch:        false,
            max_memory_restart: '512M',
            env_production: {
                NODE_ENV: 'production',
            },
            // Structured log output (JSON lines from Winston go here)
            out_file:  './logs/pm2-out.log',
            error_file:'./logs/pm2-error.log',
            merge_logs: true,
            log_date_format: '',       // Winston handles timestamps — don't double-stamp
        },

        // ── 2. Weekly Database Backup Cron ────────────────────────────────────
        // Runs every Sunday at 02:00 UTC (low-traffic window).
        // PM2 will spawn the compiled backup script as a one-shot process,
        // capture its exit code, and log stdout/stderr to the same log files.
        //
        // Change cron_restart to run more frequently during initial setup:
        //   Daily at 02:00:  '0 2 * * *'
        //   Every 6 hours:   '0 */6 * * *'
        {
            name:          'look-immo-backup',
            script:        'dist/scripts/backup.js',
            instances:     1,
            exec_mode:     'fork',
            watch:         false,
            autorestart:   false,      // Don't restart on success — it's a one-shot job
            cron_restart:  '0 2 * * 0', // Every Sunday at 02:00 UTC
            env_production: {
                NODE_ENV: 'production',
            },
            out_file:  './logs/backup-out.log',
            error_file:'./logs/backup-error.log',
            merge_logs: true,
            log_date_format: '',
        },
    ],
};
