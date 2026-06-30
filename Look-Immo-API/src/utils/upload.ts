import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ─── Directory bootstrap ──────────────────────────────────────────────────────

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
console.log(`[BOOTSTRAP] Uploads root: ${uploadsRoot}`);
const dirs = ['contracts', 'blog', 'properties'];
dirs.forEach((d) => {
    const full = path.join(uploadsRoot, d);
    if (!fs.existsSync(full)) {
        console.log(`[BOOTSTRAP] Creating directory: ${full}`);
        fs.mkdirSync(full, { recursive: true });
    }
});

// S3 Client configuration setup
const s3Configured = !!(
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
);

let s3Client: S3Client | null = null;
if (s3Configured) {
    s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
    });
}

/**
 * Uploads a file (either in-memory image webp buffer or raw PDF/doc)
 * to S3 bucket or local disk fallback depending on configuration.
 */
export async function uploadFileToStorage(
    buffer: Buffer,
    folder: string,
    filename: string,
    mimetype: string
): Promise<string> {
    const key = `${folder}/${filename}`;

    if (s3Configured && s3Client) {
        const bucket = process.env.S3_BUCKET!;
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: mimetype,
                ACL: 'public-read',
            })
        );

        if (process.env.S3_PUBLIC_URL) {
            return `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
        }

        const endpoint = process.env.S3_ENDPOINT
            ? process.env.S3_ENDPOINT.replace(/\/$/, '')
            : `https://${bucket}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com`;

        if (process.env.S3_ENDPOINT) {
            if (endpoint.includes('digitaloceanspaces.com')) {
                const urlParts = endpoint.split('://');
                return `${urlParts[0]}://${bucket}.${urlParts[1]}/${key}`;
            }
            return `${endpoint}/${bucket}/${key}`;
        }
        return `${endpoint}/${key}`;
    } else {
        // Local filesystem fallback
        const destPath = path.join(uploadsRoot, folder, filename);
        fs.writeFileSync(destPath, buffer);
        return `/uploads/${folder}/${filename}`;
    }
}

// ─── File filters ─────────────────────────────────────────────────────────────

const imageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/heic',
    'image/heif'
];

const contractTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ...imageTypes,
];

const makeFilter =
    (allowed: string[]): multer.Options['fileFilter'] =>
    (_req, file, cb) => {
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.error(`[UPLOAD] Rejected file type: ${file.mimetype} for file: ${file.originalname}`);
            cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
        }
    };

// ─── Memory storage (images go through Sharp before hitting disk) ─────────────

const memoryStorage = multer.memoryStorage();

// ─── Exported multer instances ────────────────────────────────────────────────

/** For contract / document uploads (PDF, DOC, DOCX) – saves to memory buffer, then uploaded via storage handler */
export const uploadContract = multer({
    storage: memoryStorage,
    fileFilter: makeFilter(contractTypes),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * For image uploads (property photos, blog covers).
 * Files land in memory; call `optimizeAndSave` middleware after this.
 */
export const uploadImage = multer({
    storage: memoryStorage,
    fileFilter: makeFilter(imageTypes),
    limits: { fileSize: 30 * 1024 * 1024 }, // Increased to 30 MB
});

/** Convenience alias kept for backward-compat with blog route */
export const uploadBlogImage = uploadImage;

// ─── Sharp optimisation middleware ───────────────────────────────────────────

export interface ImageVariants {
    thumb: string;  // 400px
    medium: string; // 800px
    large: string;  // 1400px
    lqip?: string;  // base64 data URL (~20px blurred JPEG) for inline placeholder
}

export interface OptimizeOptions {
    /** Sub-folder inside uploads/ to write the file, e.g. 'properties' or 'blog' */
    folder: 'properties' | 'blog';
    /** Max width in px — only used when multiSize is false (blog mode) */
    width?: number;
    /** WebP quality 1-100 (default 82) */
    quality?: number;
    /**
     * When true, generate 3 size variants (thumb/medium/large) and attach
     * req.optimizedSrcSet alongside req.optimizedPath (the large variant).
     * When false (blog), generate a single image as before.
     */
    multiSize?: boolean;
}

/**
 * Express middleware that reads `req.file` (from multer memory storage),
 * compresses it with Sharp, uploads the result(s), and attaches:
 *   - `req.optimizedPath`   — the large (or only) variant URL
 *   - `req.optimizedSrcSet` — { thumb, medium, large } when multiSize=true
 */
export const optimizeAndSave =
    (opts: OptimizeOptions) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.file) {
            console.log('[UPLOAD] No file received in req.file');
            next();
            return;
        }

        try {
            console.log(`[UPLOAD] Starting optimization for: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);
            const { folder, quality = 82, multiSize = false } = opts;
            const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

            if (multiSize) {
                // ── Multi-size property images ─────────────────────────────────
                const sizes: Array<{ suffix: keyof ImageVariants; width: number }> = [
                    { suffix: 'thumb',  width: 400 },
                    { suffix: 'medium', width: 800 },
                    { suffix: 'large',  width: 1400 },
                ];

                try {
                    // Rotate once from EXIF, then derive each size from the same base
                    const baseImage = sharp(req.file.buffer).rotate();

                    const results = await Promise.all(
                        sizes.map(async ({ suffix, width }) => {
                            const filename = `${folder}-${uid}-${suffix}.webp`;
                            const buffer = await baseImage
                                .clone()
                                .resize({ width, withoutEnlargement: true })
                                .webp({ quality })
                                .toBuffer();
                            const url = await uploadFileToStorage(buffer, folder, filename, 'image/webp');
                            return { suffix, url };
                        })
                    );

                    const variants = results.reduce((acc, { suffix, url }) => {
                        acc[suffix] = url;
                        return acc;
                    }, {} as ImageVariants);

                    // Generate LQIP: 20px wide, heavily blurred, base64 JPEG
                    // Typically ~200-400 bytes — stored inline in JSON, no extra HTTP request
                    try {
                        const lqipBuffer = await baseImage
                            .clone()
                            .resize(20)
                            .blur(8)
                            .jpeg({ quality: 20 })
                            .toBuffer();
                        variants.lqip = `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
                        console.log(`[UPLOAD] LQIP generated (${lqipBuffer.length} bytes) for uid=${uid}`);
                    } catch (lqipErr) {
                        console.warn('[UPLOAD] LQIP generation failed (non-fatal):', lqipErr);
                        // lqip stays undefined — frontend falls back to gray bg
                    }

                    (req as any).optimizedPath = variants.large;       // Backwards compat
                    (req as any).optimizedSrcSet = variants;            // srcset + lqip data
                    console.log(`[UPLOAD] Generated 3-size variants for uid=${uid}`);
                } catch (sharpErr) {
                    console.error('[UPLOAD] Sharp multi-size failed, falling back to single raw file:', sharpErr);
                    const ext = path.extname(req.file.originalname) || '.jpg';
                    const fallbackFilename = `${folder}-${uid}${ext}`;
                    const fileUrl = await uploadFileToStorage(req.file.buffer, folder, fallbackFilename, req.file.mimetype);
                    (req as any).optimizedPath = fileUrl;
                    (req as any).optimizedSrcSet = null;
                }
            } else {
                // ── Single-size blog/other images ──────────────────────────────
                const { width = 900 } = opts;
                const filename = `${folder}-${uid}.webp`;

                try {
                    const optimizedBuffer = await sharp(req.file.buffer)
                        .rotate()
                        .resize({ width, withoutEnlargement: true })
                        .webp({ quality })
                        .toBuffer();

                    const fileUrl = await uploadFileToStorage(optimizedBuffer, folder, filename, 'image/webp');
                    (req as any).optimizedPath = fileUrl;
                    (req as any).optimizedSrcSet = null;
                    console.log(`[UPLOAD] Successfully optimized and saved single: ${filename} to ${fileUrl}`);
                } catch (sharpErr) {
                    console.error('[UPLOAD] Sharp failed, saving raw file as fallback:', sharpErr);
                    const ext = path.extname(req.file.originalname) || '.jpg';
                    const fallbackFilename = `${folder}-${uid}${ext}`;
                    const fileUrl = await uploadFileToStorage(req.file.buffer, folder, fallbackFilename, req.file.mimetype);
                    (req as any).optimizedPath = fileUrl;
                    (req as any).optimizedSrcSet = null;
                    console.log(`[UPLOAD] Successfully saved raw fallback: ${fallbackFilename} to ${fileUrl}`);
                }
            }

            next();
        } catch (err: any) {
            console.error('[UPLOAD] Critical upload error:', err);
            next(err);
        }
    };

