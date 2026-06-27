"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeAndSave = exports.uploadBlogImage = exports.uploadImage = exports.uploadContract = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
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
// ─── Disk storage (contracts – no compression needed) ────────────────────────
const contractStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, path_1.default.join(uploadsRoot, 'contracts')),
    filename: (_req, file, cb) => {
        const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `contract-${uid}${path_1.default.extname(file.originalname)}`);
    },
});
// ─── Exported multer instances ────────────────────────────────────────────────
/** For contract / document uploads (PDF, DOC, DOCX) – saves directly to disk */
exports.uploadContract = (0, multer_1.default)({
    storage: contractStorage,
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
 * compresses it with Sharp, saves the result to disk, and attaches
 * `req.optimizedPath` (the public URL path) so the next controller can use it.
 */
const optimizeAndSave = (opts) => async (req, res, next) => {
    if (!req.file) {
        console.log('[UPLOAD] No file received in req.file');
        next();
        return;
    }
    try {
        console.log(`[UPLOAD] Starting optimization for: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);
        const { folder, width = folder === 'blog' ? 900 : 1400, quality = 78 } = opts;
        const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${folder}-${uid}.webp`;
        const destPath = path_1.default.join(uploadsRoot, folder, filename);
        console.log(`[UPLOAD] Target path: ${destPath}`);
        try {
            await (0, sharp_1.default)(req.file.buffer)
                .rotate() // auto-rotate from EXIF
                .resize({ width, withoutEnlargement: true })
                .webp({ quality })
                .toFile(destPath);
            console.log(`[UPLOAD] Successfully optimized and saved: ${filename}`);
        }
        catch (sharpErr) {
            console.error('[UPLOAD] Sharp failed, saving raw file as fallback:', sharpErr);
            // Fallback: save raw file with original extension if sharp fails
            const ext = path_1.default.extname(req.file.originalname) || '.jpg';
            const fallbackFilename = `${folder}-${uid}${ext}`;
            const fallbackPath = path_1.default.join(uploadsRoot, folder, fallbackFilename);
            fs_1.default.writeFileSync(fallbackPath, req.file.buffer);
            req.optimizedPath = `/uploads/${folder}/${fallbackFilename}`;
            console.log(`[UPLOAD] Successfully saved raw fallback: ${fallbackFilename}`);
            next();
            return;
        }
        // Attach the public URL so the controller can persist it
        req.optimizedPath = `/uploads/${folder}/${filename}`;
        next();
    }
    catch (err) {
        console.error('[UPLOAD] Critical upload error:', err);
        next(err);
    }
};
exports.optimizeAndSave = optimizeAndSave;
//# sourceMappingURL=upload.js.map