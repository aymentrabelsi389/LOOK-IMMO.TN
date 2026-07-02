import { Request, Response } from 'express';
/**
 * POST /api/upload/image
 *
 * Called after `uploadImage.single('image')` and `optimizeAndSave(...)` middleware.
 * By the time we reach here, Sharp has already compressed the image and
 * req.optimizedPath holds the public URL path (e.g. /uploads/properties/xxx.webp).
 */
export declare const handleImageUpload: (req: Request, res: Response) => void;
/**
 * POST /api/upload/property-document
 *
 * Called after `uploadContract.single('file')` middleware.
 * Enforces strictly PDF documents and returns the public URL path.
 */
export declare const handleDocumentUpload: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/download
 *
 * Secure download endpoint to serve PDF documents with Content-Disposition: attachment header.
 */
export declare const downloadFile: (req: Request, res: Response) => void;
//# sourceMappingURL=uploadController.d.ts.map