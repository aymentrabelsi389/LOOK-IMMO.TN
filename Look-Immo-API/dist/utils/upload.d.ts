import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
/** For contract / document uploads (PDF, DOC, DOCX) – saves directly to disk */
export declare const uploadContract: multer.Multer;
/**
 * For image uploads (property photos, blog covers).
 * Files land in memory; call `optimizeAndSave` middleware after this.
 */
export declare const uploadImage: multer.Multer;
/** Convenience alias kept for backward-compat with blog route */
export declare const uploadBlogImage: multer.Multer;
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
export declare const optimizeAndSave: (opts: OptimizeOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=upload.d.ts.map