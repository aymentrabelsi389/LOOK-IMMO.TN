import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

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

// ─── Disk storage (contracts – no compression needed) ────────────────────────

const contractStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(uploadsRoot, 'contracts')),
    filename: (_req, file, cb) => {
        const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `contract-${uid}${path.extname(file.originalname)}`);
    },
});

// ─── Exported multer instances ────────────────────────────────────────────────

/** For contract / document uploads (PDF, DOC, DOCX) – saves directly to disk */
export const uploadContract = multer({
    storage: contractStorage,
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

export interface OptimizeOptions {
    /** Sub-folder inside uploads/ to write the file, e.g. 'properties' or 'blog' */
    folder: 'properties' | 'blog';
    /** Max width in px (default 1400 for properties, 900 for blog) */
    width?: number;
    /** WebP quality 1-100 (default 82) */
    quality?: number;
}

/**
 * Express middleware that reads `req.file` (from multer memory storage),
 * compresses it with Sharp, saves the result to disk, and attaches
 * `req.optimizedPath` (the public URL path) so the next controller can use it.
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
            const { folder, width = folder === 'blog' ? 900 : 1400, quality = 78 } = opts;

            const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const filename = `${folder}-${uid}.webp`;
            const destPath = path.join(uploadsRoot, folder, filename);

            console.log(`[UPLOAD] Target path: ${destPath}`);

            try {
                await sharp(req.file.buffer)
                    .rotate()                          // auto-rotate from EXIF
                    .resize({ width, withoutEnlargement: true })
                    .webp({ quality })
                    .toFile(destPath);
                
                console.log(`[UPLOAD] Successfully optimized and saved: ${filename}`);
            } catch (sharpErr) {
                console.error('[UPLOAD] Sharp failed, saving raw file as fallback:', sharpErr);
                // Fallback: save raw file with original extension if sharp fails
                const ext = path.extname(req.file.originalname) || '.jpg';
                const fallbackFilename = `${folder}-${uid}${ext}`;
                const fallbackPath = path.join(uploadsRoot, folder, fallbackFilename);
                fs.writeFileSync(fallbackPath, req.file.buffer);
                
                (req as any).optimizedPath = `/uploads/${folder}/${fallbackFilename}`;
                console.log(`[UPLOAD] Successfully saved raw fallback: ${fallbackFilename}`);
                next();
                return;
            }

            // Attach the public URL so the controller can persist it
            (req as any).optimizedPath = `/uploads/${folder}/${filename}`;
            next();
        } catch (err: any) {
            console.error('[UPLOAD] Critical upload error:', err);
            next(err);
        }
    };
