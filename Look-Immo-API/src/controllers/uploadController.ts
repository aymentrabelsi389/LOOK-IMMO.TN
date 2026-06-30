import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { uploadFileToStorage } from '../utils/upload';

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
export const handleDocumentUpload = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ error: 'Aucun fichier reçu.' });
        return;
    }

    // Strictly enforce PDF format
    if (req.file.mimetype !== 'application/pdf') {
        res.status(400).json({ error: 'Seuls les fichiers PDF sont autorisés.' });
        return;
    }

    try {
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
    } catch (error) {
        console.error('[UPLOAD] Document upload failed:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement du document.' });
    }
};

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

    // If it is an external URL (e.g. S3 public URL), redirect to it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
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
        console.error('File download error:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement.' });
    }
};


