"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeAndSave = exports.uploadBlogImage = exports.uploadImage = exports.uploadContract = void 0;
exports.uploadFileToStorage = uploadFileToStorage;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const client_s3_1 = require("@aws-sdk/client-s3");
// ─── Directory bootstrap ──────────────────────────────────────────────────────
const uploadsRoot = path_1.default.resolve(process.cwd(), 'uploads');
console.log(`[BOOTSTRAP] Uploads root: ${uploadsRoot}`);
const dirs = ['contracts', 'blog', 'properties'];
dirs.forEach((d) => {
    const full = path_1.default.join(uploadsRoot, d);
    if (!fs_1.default.existsSync(full)) {
        console.log(`[BOOTSTRAP] Creating directory: ${full}`);
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
const makeFilter = (allowed) => (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        console.error(`[UPLOAD] Rejected file type: ${file.mimetype} for file: ${file.originalname}`);
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
};
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
                    console.log(`[UPLOAD] LQIP generated (${lqipBuffer.length} bytes) for uid=${uid}`);
                }
                catch (lqipErr) {
                    console.warn('[UPLOAD] LQIP generation failed (non-fatal):', lqipErr);
                    // lqip stays undefined — frontend falls back to gray bg
                }
                req.optimizedPath = variants.large; // Backwards compat
                req.optimizedSrcSet = variants; // srcset + lqip data
                console.log(`[UPLOAD] Generated 3-size variants for uid=${uid}`);
            }
            catch (sharpErr) {
                console.error('[UPLOAD] Sharp multi-size failed, falling back to single raw file:', sharpErr);
                const ext = path_1.default.extname(req.file.originalname) || '.jpg';
                const fallbackFilename = `${folder}-${uid}${ext}`;
                const fileUrl = await uploadFileToStorage(req.file.buffer, folder, fallbackFilename, req.file.mimetype);
                req.optimizedPath = fileUrl;
                req.optimizedSrcSet = null;
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
                console.log(`[UPLOAD] Successfully optimized and saved single: ${filename} to ${fileUrl}`);
            }
            catch (sharpErr) {
                console.error('[UPLOAD] Sharp failed, saving raw file as fallback:', sharpErr);
                const ext = path_1.default.extname(req.file.originalname) || '.jpg';
                const fallbackFilename = `${folder}-${uid}${ext}`;
                const fileUrl = await uploadFileToStorage(req.file.buffer, folder, fallbackFilename, req.file.mimetype);
                req.optimizedPath = fileUrl;
                req.optimizedSrcSet = null;
                console.log(`[UPLOAD] Successfully saved raw fallback: ${fallbackFilename} to ${fileUrl}`);
            }
        }
        next();
    }
    catch (err) {
        console.error('[UPLOAD] Critical upload error:', err);
        next(err);
    }
};
exports.optimizeAndSave = optimizeAndSave;
//# sourceMappingURL=upload.js.map