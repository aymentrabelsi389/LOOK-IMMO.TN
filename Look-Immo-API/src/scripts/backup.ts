#!/usr/bin/env ts-node
/**
 * ─── PostgreSQL Automated Backup Script ───────────────────────────────────────
 *
 * Run manually:   npx ts-node src/scripts/backup.ts
 * Run compiled:   node dist/scripts/backup.js
 * Scheduled via:  PM2 ecosystem.config.js  OR  system cron
 *
 * What it does:
 *   1. Runs pg_dump (custom binary format = compressed, fast restore)
 *   2. Streams the dump directly into S3/R2 (no temp file on disk)
 *   3. Tags the object with the timestamp and database name
 *   4. Prunes S3 objects older than BACKUP_RETENTION_DAYS (default 30)
 *   5. Exits 0 on success, 1 on failure (so PM2/cron can alert)
 *
 * Requirements:
 *   - pg_dump in PATH (comes with postgresql-client package)
 *   - S3_* env vars configured (same credentials as the main app)
 *   - DATABASE_URL env var set
 */

import dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';
import {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
    type ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATABASE_URL      = process.env.DATABASE_URL!;
const RETENTION_DAYS    = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const S3_BUCKET         = process.env.S3_BUCKET!;
const S3_PREFIX         = process.env.BACKUP_S3_PREFIX || 'db-backups/';
const DB_NAME           = process.env.BACKUP_DB_NAME   || 'lookimmo';

// ─── Validate ─────────────────────────────────────────────────────────────────

function validateConfig(): void {
    const missing: string[] = [];
    if (!DATABASE_URL)                   missing.push('DATABASE_URL');
    if (!S3_BUCKET)                      missing.push('S3_BUCKET');
    if (!process.env.S3_ACCESS_KEY_ID)   missing.push('S3_ACCESS_KEY_ID');
    if (!process.env.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');

    if (missing.length > 0) {
        logger.error('[backup] Missing required environment variables', { missing });
        process.exit(1);
    }
}

// ─── S3 Client ────────────────────────────────────────────────────────────────

function createS3Client(): S3Client {
    return new S3Client({
        region:   process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: {
            accessKeyId:     process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        // Required for Cloudflare R2 (path-style addressing)
        forcePathStyle: !!process.env.S3_ENDPOINT,
    });
}

// ─── pg_dump → Buffer ─────────────────────────────────────────────────────────

function runPgDump(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const startMs = Date.now();
        const chunks: Buffer[] = [];

        logger.info('[backup] Starting pg_dump…', { db: DB_NAME });

        const pg = spawn('pg_dump', [
            '--format=custom',  // Custom binary format: compressed + supports parallel restore
            '--no-acl',         // Skip GRANT/REVOKE — managed separately
            '--no-owner',       // Skip ownership — avoids user mismatch on restore
            DATABASE_URL,
        ], {
            // Suppress pg_dump's own stderr (connection info etc.) unless there's an error
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        pg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

        let stderrOutput = '';
        pg.stderr.on('data', (d: Buffer) => { stderrOutput += d.toString(); });

        pg.on('close', (code) => {
            if (code !== 0) {
                logger.error('[backup] pg_dump exited with error', { code, stderr: stderrOutput });
                return reject(new Error(`pg_dump failed (exit ${code}): ${stderrOutput}`));
            }
            const dump = Buffer.concat(chunks);
            const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
            logger.info('[backup] pg_dump complete', {
                sizeMB:  (dump.length / 1024 / 1024).toFixed(2),
                elapsed: `${elapsed}s`,
            });
            resolve(dump);
        });

        pg.on('error', (err) => {
            // pg_dump binary not found in PATH
            reject(new Error(
                `Failed to spawn pg_dump: ${err.message}\n` +
                `Install PostgreSQL client tools: apt-get install postgresql-client`
            ));
        });
    });
}

// ─── Upload to S3 ─────────────────────────────────────────────────────────────

async function uploadToS3(s3: S3Client, dump: Buffer, key: string): Promise<void> {
    logger.info('[backup] Uploading to S3…', { bucket: S3_BUCKET, key });

    await s3.send(new PutObjectCommand({
        Bucket:      S3_BUCKET,
        Key:         key,
        Body:        dump,
        ContentType: 'application/octet-stream',
        // Object metadata for easy identification without downloading
        Metadata: {
            database:  DB_NAME,
            createdAt: new Date().toISOString(),
            format:    'pg_dump-custom',
        },
    }));

    logger.info('[backup] Upload complete', { key });
}

// ─── Retention: Delete objects older than RETENTION_DAYS ─────────────────────

async function pruneOldBackups(s3: S3Client): Promise<void> {
    logger.info('[backup] Checking retention policy…', { retentionDays: RETENTION_DAYS });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    // List all backup objects under our prefix
    const list = await s3.send(new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: S3_PREFIX,
    }));

    const toDelete: ObjectIdentifier[] = (list.Contents ?? [])
        .filter((obj) => obj.LastModified && obj.LastModified < cutoff && obj.Key)
        .map((obj) => ({ Key: obj.Key! }));

    if (toDelete.length === 0) {
        logger.info('[backup] No expired backups to prune.');
        return;
    }

    await s3.send(new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: toDelete, Quiet: false },
    }));

    logger.info('[backup] Pruned expired backups', {
        count:   toDelete.length,
        keys:    toDelete.map((o) => o.Key),
        cutoff:  cutoff.toISOString(),
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    validateConfig();

    const now       = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const key       = `${S3_PREFIX}${DB_NAME}_${timestamp}.dump`;

    logger.info('[backup] === PostgreSQL backup started ===', {
        database:      DB_NAME,
        bucket:        S3_BUCKET,
        key,
        retentionDays: RETENTION_DAYS,
    });

    const s3 = createS3Client();

    try {
        const dump = await runPgDump();
        await uploadToS3(s3, dump, key);
        await pruneOldBackups(s3);

        logger.info('[backup] === Backup finished successfully ===', { key });
        process.exit(0);
    } catch (err) {
        logger.error('[backup] === Backup FAILED ===', {
            error:   (err as Error).message,
            stack:   (err as Error).stack,
        });
        process.exit(1);
    }
}

main();
