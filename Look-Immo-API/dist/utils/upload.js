"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeAndSave = exports.uploadBlogImage = exports.uploadImage = exports.uploadContract = exports.assertMagicBytes = void 0;
exports.uploadFileToStorage = uploadFileToStorage;
exports.detectMimeFromMagicBytes = detectMimeFromMagicBytes;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const client_s3_1 = require("@aws-sdk/client-s3");
const logger_1 = require("./logger");
// ─── Directory bootstrap ──────────────────────────────────────────────────────
const uploadsRoot = path_1.default.resolve(process.cwd(), 'uploads');
logger_1.logger.info(`[BOOTSTRAP] Uploads root: ${uploadsRoot}`);
const dirs = ['contracts', 'blog', 'properties'];
dirs.forEach((d) => {
    const full = path_1.default.join(uploadsRoot, d);
    if (!fs_1.default.existsSync(full)) {
        logger_1.logger.info(`[BOOTSTRAP] Creating directory: ${full}`);
        fs_1.default.mkdirSync(full, { recursive: true });
    }
});
// S3 Client configuration setup
const s3Configured = !!(process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET);
let s3Client = null;
if (s3Configured) {
    s3Client = new client_s3_1.S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
    });
}
/**
 * Uploads a file (either in-memory image webp buffer or raw PDF/doc)
 * to S3 bucket or local disk fallback depending on configuration.
 */
async function uploadFileToStorage(buffer, folder, filename, mimetype) {
    const key = `${folder}/${filename}`;
    if (s3Configured && s3Client) {
        const bucket = process.env.S3_BUCKET;
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
            ACL: 'public-read',
        }));
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
    }
    else {
        // Local filesystem fallback
        const destPath = path_1.default.join(uploadsRoot, folder, filename);
        fs_1.default.writeFileSync(destPath, buffer);
        return `/uploads/${folder}/${filename}`;
    }
}
// ─── File filters ─────────────────────────────────────────────────────────────
// SVG, GIF, BMP and ICO are intentionally excluded:
// - SVG can carry embedded scripts → stored XSS if served raw
// - GIF, BMP, ICO are not rasterized by Sharp and not needed for property/blog photos
const imageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
];
const contractTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ...imageTypes,
];
const makeFilter = (allowed) => (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        logger_1.logger.error(`[UPLOAD] Rejected file type: ${file.mimetype} for file: ${file.originalname}`);
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
};
// ─── Magic-byte file-type validation ─────────────────────────────────────────
const HEIF_BRANDS = new Set([
    'heic', 'heis', 'heix', 'hevc', 'hevx', 'heim', 'hevs', 'mif1', 'msf1',
]);
/**
 * Inspects the first 16 bytes of `buffer` and returns the actual MIME type,
 * or `null` if the bytes do not match any format we accept.
 *
 * Supported: JPEG, PNG, WebP, HEIC/HEIF, PDF.
 * SVG and other text-based formats intentionally return `null` — they cannot
 * be verified by magic bytes and must not be accepted.
 */
function detectMimeFromMagicBytes(buffer) {
    if (buffer.length < 4)
        return null;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 &&
        buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A &&
        buffer[6] === 0x1A && buffer[7] === 0x0A) {
        return 'image/png';
    }
    // WebP: RIFF at bytes 0-3, WEBP at bytes 8-11
    if (buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && // RI
        buffer[2] === 0x46 && buffer[3] === 0x46 && // FF
        buffer[8] === 0x57 && buffer[9] === 0x45 && // WE
        buffer[10] === 0x42 && buffer[11] === 0x50 // BP
    ) {
        return 'image/webp';
    }
    // HEIC/HEIF: 'ftyp' box at offset 4, brand string at offset 8
    if (buffer.length >= 12 &&
        buffer[4] === 0x66 && buffer[5] === 0x74 && // ft
        buffer[6] === 0x79 && buffer[7] === 0x70 // yp
    ) {
        const brand = buffer.slice(8, 12).toString('ascii').toLowerCase();
        if (HEIF_BRANDS.has(brand))
            return 'image/heic';
    }
    // PDF: %PDF-
    if (buffer.length >= 5 &&
        buffer[0] === 0x25 && buffer[1] === 0x50 && // %P
        buffer[2] === 0x44 && buffer[3] === 0x46 && // DF
        buffer[4] === 0x2D // -
    ) {
        return 'application/pdf';
    }
    return null;
}
/**
 * Express middleware that validates `req.file.buffer` magic bytes against
 * the client-declared `req.file.mimetype`. Returns 415 if:
 *  - the bytes do not match any known/allowed format, or
 *  - the detected type conflicts with the declared MIME type (spoofed header).
 *
 * Place AFTER a multer middleware (so req.file is populated in memory)
 * and BEFORE any processing (optimizeAndSave / handleDocumentUpload).
 */
const assertMagicBytes = () => (req, res, next) => {
    if (!req.file) {
        next();
        return;
    }
    const detected = detectMimeFromMagicBytes(req.file.buffer);
    if (!detected) {
        res.status(415).json({ error: 'Type de fichier non reconnu ou non autorisé.' });
        return;
    }
    // Normalise MIME aliases before comparing (image/jpg ↔ image/jpeg)
    const normalise = (m) => (m === 'image/jpg' ? 'image/jpeg' : m);
    if (normalise(detected) !== normalise(req.file.mimetype)) {
        res.status(415).json({ error: 'Le contenu du fichier ne correspond pas au type déclaré.' });
        return;
    }
    next();
};
exports.assertMagicBytes = assertMagicBytes;
// ─── Memory storage (images go through Sharp before hitting disk) ─────────────
const memoryStorage = multer_1.default.memoryStorage();
// ─── Exported multer instances ────────────────────────────────────────────────
/** For contract / document uploads (PDF, DOC, DOCX) – saves to memory buffer, then uploaded via storage handler */
exports.uploadContract = (0, multer_1.default)({
    storage: memoryStorage,
    fileFilter: makeFilter(contractTypes),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
/**
 * For image uploads (property photos, blog covers).
 * Files land in memory; call `optimizeAndSave` middleware after this.
 */
exports.uploadImage = (0, multer_1.default)({
    storage: memoryStorage,
    fileFilter: makeFilter(imageTypes),
    limits: { fileSize: 30 * 1024 * 1024 }, // Increased to 30 MB
});
/** Convenience alias kept for backward-compat with blog route */
exports.uploadBlogImage = exports.uploadImage;
/**
 * Express middleware that reads `req.file` (from multer memory storage),
 * compresses it with Sharp, uploads the result(s), and attaches:
 *   - `req.optimizedPath`   — the large (or only) variant URL
 *   - `req.optimizedSrcSet` — { thumb, medium, large } when multiSize=true
 */
const optimizeAndSave = (opts) => async (req, res, next) => {
    if (!req.file) {
        logger_1.logger.info('[UPLOAD] No file received in req.file');
        next();
        return;
    }
    try {
        logger_1.logger.info(`[UPLOAD] Starting optimization for: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);
        const { folder, quality = 82, multiSize = false } = opts;
        const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        if (multiSize) {
            // ── Multi-size property images ─────────────────────────────────
            const sizes = [
                { suffix: 'thumb', width: 400 },
                { suffix: 'medium', width: 800 },
                { suffix: 'large', width: 1400 },
            ];
            try {
                // Rotate once from EXIF, then derive each size from the same base
                const baseImage = (0, sharp_1.default)(req.file.buffer).rotate();
                const results = await Promise.all(sizes.map(async ({ suffix, width }) => {
                    const filename = `${folder}-${uid}-${suffix}.webp`;
                    const buffer = await baseImage
                        .clone()
                        .resize({ width, withoutEnlargement: true })
                        .webp({ quality })
                        .toBuffer();
                    const url = await uploadFileToStorage(buffer, folder, filename, 'image/webp');
                    return { suffix, url };
                }));
                const variants = results.reduce((acc, { suffix, url }) => {
                    acc[suffix] = url;
                    return acc;
                }, {});
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
                    logger_1.logger.info(`[UPLOAD] LQIP generated (${lqipBuffer.length} bytes) for uid=${uid}`);
                }
                catch (lqipErr) {
                    logger_1.logger.warn('[UPLOAD] LQIP generation failed (non-fatal):', lqipErr);
                    // lqip stays undefined — frontend falls back to gray bg
                }
                req.optimizedPath = variants.large; // Backwards compat
                req.optimizedSrcSet = variants; // srcset + lqip data
                logger_1.logger.info(`[UPLOAD] Generated 3-size variants for uid=${uid}`);
            }
            catch (sharpErr) {
                // Do NOT fall back to saving raw bytes — an unprocessed file could
                // contain malicious content (e.g. SVG scripts). Surface as 500 instead.
                logger_1.logger.error('[UPLOAD] Sharp multi-size processing failed:', sharpErr);
                throw sharpErr;
            }
        }
        else {
            // ── Single-size blog/other images ──────────────────────────────
            const { width = 900 } = opts;
            const filename = `${folder}-${uid}.webp`;
            try {
                const optimizedBuffer = await (0, sharp_1.default)(req.file.buffer)
                    .rotate()
                    .resize({ width, withoutEnlargement: true })
                    .webp({ quality })
                    .toBuffer();
                const fileUrl = await uploadFileToStorage(optimizedBuffer, folder, filename, 'image/webp');
                req.optimizedPath = fileUrl;
                req.optimizedSrcSet = null;
                logger_1.logger.info(`[UPLOAD] Successfully optimized and saved single: ${filename} to ${fileUrl}`);
            }
            catch (sharpErr) {
                // Do NOT fall back to saving raw bytes — an unprocessed file could
                // contain malicious content (e.g. SVG scripts). Surface as 500 instead.
                logger_1.logger.error('[UPLOAD] Sharp single-size processing failed:', sharpErr);
                throw sharpErr;
            }
        }
        next();
    }
    catch (err) {
        logger_1.logger.error('[UPLOAD] Critical upload error:', err);
        next(err);
    }
};
exports.optimizeAndSave = optimizeAndSave;
//# sourceMappingURL=upload.js.map