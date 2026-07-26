import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
/**
 * Uploads a file (either in-memory image webp buffer or raw PDF/doc)
 * to S3 bucket or local disk fallback depending on configuration.
 */
export declare function uploadFileToStorage(buffer: Buffer, folder: string, filename: string, mimetype: string): Promise<string>;
/**
 * Inspects the first 16 bytes of `buffer` and returns the actual MIME type,
 * or `null` if the bytes do not match any format we accept.
 *
 * Supported: JPEG, PNG, WebP, HEIC/HEIF, PDF.
 * SVG and other text-based formats intentionally return `null` — they cannot
 * be verified by magic bytes and must not be accepted.
 */
export declare function detectMimeFromMagicBytes(buffer: Buffer): string | null;
/**
 * Express middleware that validates `req.file.buffer` magic bytes against
 * the client-declared `req.file.mimetype`. Returns 415 if:
 *  - the bytes do not match any known/allowed format, or
 *  - the detected type conflicts with the declared MIME type (spoofed header).
 *
 * Place AFTER a multer middleware (so req.file is populated in memory)
 * and BEFORE any processing (optimizeAndSave / handleDocumentUpload).
 */
export declare const assertMagicBytes: () => (req: Request, res: Response, next: NextFunction) => void;
/** For contract / document uploads (PDF, DOC, DOCX) – saves to memory buffer, then uploaded via storage handler */
export declare const uploadContract: multer.Multer;
/**
 * For image uploads (property photos, blog covers).
 * Files land in memory; call `optimizeAndSave` middleware after this.
 */
export declare const uploadImage: multer.Multer;
/** Convenience alias kept for backward-compat with blog route */
export declare const uploadBlogImage: multer.Multer;
export interface ImageVariants {
    thumb: string;
    medium: string;
    large: string;
    lqip?: string;
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
export declare const optimizeAndSave: (opts: OptimizeOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=upload.d.ts.map