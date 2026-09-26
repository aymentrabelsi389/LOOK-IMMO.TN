import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { uploadFileToStorage } from '../../core/storage/upload';
import { asyncHandler, BadRequestError, ForbiddenError, NotFoundError } from '../../core/errors';

/**
 * Build the set of trusted redirect origins from env vars at startup.
 * Only URLs whose origin matches one of these will be followed by downloadFile.
 *
 * Populated from:
 *   S3_PUBLIC_URL  — CDN / Spaces public URL
 *   S3_ENDPOINT    — S3-compatible endpoint
 *   BACKEND_URL    — own server (serves local /uploads/ files)
 *
 * If none are set the set is empty and all external redirects are blocked.
 */
function buildAllowedOrigins(): Set<string> {
    const origins = new Set<string>();
    const add = (raw: string | undefined) => {
        if (!raw) return;
        try { origins.add(new URL(raw).origin); } catch { /* ignore invalid URL */ }
    };
    add(process.env.S3_PUBLIC_URL);
    add(process.env.S3_ENDPOINT);
    add(process.env.BACKEND_URL);
    return origins;
}

const ALLOWED_REDIRECT_ORIGINS = buildAllowedOrigins();

/**
 * POST /api/upload/image
 *
 * Called after `uploadImage.single('image')` and `optimizeAndSave(...)` middleware.
 * By the time we reach here, Sharp has already compressed the image and
 * req.optimizedPath holds the public URL path (e.g. /uploads/properties/xxx.webp).
 */
export const handleImageUpload = (req: Request, res: Response): void => {
    const optimizedPath = (req as any).optimizedPath as string | undefined;
    const optimizedSrcSet = (req as any).optimizedSrcSet as { thumb: string; medium: string; large: string } | null | undefined;

    if (!optimizedPath) {
        res.status(400).json({ error: 'No image was uploaded or optimization failed.' });
        return;
    }

    res.status(201).json({
        url: optimizedPath,           // Large variant (backwards compatible — store this in images[])
        srcset: optimizedSrcSet || null, // { thumb, medium, large } — store as JSON string in images[] alongside url
        message: 'Image uploaded and optimized successfully',
    });
};

/**
 * POST /api/upload/property-document
 *
 * Called after `uploadContract.single('file')` middleware.
 * Enforces strictly PDF documents and returns the public URL path.
 */
export const handleDocumentUpload = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
        throw new BadRequestError('Aucun fichier reçu.');
    }

    // Strictly enforce PDF format
    if (req.file.mimetype !== 'application/pdf') {
        throw new BadRequestError('Seuls les fichiers PDF sont autorisés.');
    }

    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `contract-${uid}${path.extname(req.file.originalname)}`;
    
    const fileUrl = await uploadFileToStorage(
        req.file.buffer,
        'contracts',
        filename,
        req.file.mimetype
    );

    res.status(201).json({
        url: fileUrl,
        message: 'Document mis en ligne avec succès',
    });
});

/**
 * GET /api/download
 *
 * Secure download endpoint to serve PDF documents with Content-Disposition: attachment header.
 */
export const downloadFile = (req: Request, res: Response): void => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'L\'URL du fichier est requise.' });
        return;
    }

    // If it is an external URL (e.g. S3 public URL), only redirect to trusted origins.
    // Unrestricted redirect would allow open-redirect phishing via /api/download?url=...
    if (url.startsWith('http://') || url.startsWith('https://')) {
        let origin: string;
        try {
            origin = new URL(url).origin;
        } catch {
            res.status(400).json({ error: 'URL invalide.' });
            return;
        }
        if (!ALLOWED_REDIRECT_ORIGINS.has(origin)) {
            res.status(403).json({ error: 'Redirect vers une URL non autorisée.' });
            return;
        }
        res.redirect(url);
        return;
    }

    try {
        // Prevent path traversal attacks
        const relativePath = url.replace(/^\/+/, '').replace(/^uploads\/+/, 'uploads/');
        const cleanPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.resolve(process.cwd(), cleanPath);

        // Ensure the file is inside the uploads directory
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        if (!absolutePath.startsWith(uploadsDir)) {
            res.status(403).json({ error: 'Accès interdit.' });
            return;
        }

        if (!fs.existsSync(absolutePath)) {
            res.status(404).json({ error: 'Fichier introuvable.' });
            return;
        }

        // Force browser download
        res.download(absolutePath);
    } catch (error) {
        // downloadFile is synchronous — errors here are truly unexpected
        throw error;
    }
};
