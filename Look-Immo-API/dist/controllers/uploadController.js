"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = exports.handleDocumentUpload = exports.handleImageUpload = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const upload_1 = require("../utils/upload");
const logger_1 = require("../utils/logger");
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
function buildAllowedOrigins() {
    const origins = new Set();
    const add = (raw) => {
        if (!raw)
            return;
        try {
            origins.add(new URL(raw).origin);
        }
        catch { /* ignore invalid URL */ }
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
const handleImageUpload = (req, res) => {
    const optimizedPath = req.optimizedPath;
    const optimizedSrcSet = req.optimizedSrcSet;
    if (!optimizedPath) {
        res.status(400).json({ error: 'No image was uploaded or optimization failed.' });
        return;
    }
    res.status(201).json({
        url: optimizedPath, // Large variant (backwards compatible — store this in images[])
        srcset: optimizedSrcSet || null, // { thumb, medium, large } — store as JSON string in images[] alongside url
        message: 'Image uploaded and optimized successfully',
    });
};
exports.handleImageUpload = handleImageUpload;
/**
 * POST /api/upload/property-document
 *
 * Called after `uploadContract.single('file')` middleware.
 * Enforces strictly PDF documents and returns the public URL path.
 */
const handleDocumentUpload = async (req, res) => {
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
        const filename = `contract-${uid}${path_1.default.extname(req.file.originalname)}`;
        const fileUrl = await (0, upload_1.uploadFileToStorage)(req.file.buffer, 'contracts', filename, req.file.mimetype);
        res.status(201).json({
            url: fileUrl,
            message: 'Document mis en ligne avec succès',
        });
    }
    catch (error) {
        logger_1.logger.error('[UPLOAD] Document upload failed:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement du document.' });
    }
};
exports.handleDocumentUpload = handleDocumentUpload;
/**
 * GET /api/download
 *
 * Secure download endpoint to serve PDF documents with Content-Disposition: attachment header.
 */
const downloadFile = (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'L\'URL du fichier est requise.' });
        return;
    }
    // If it is an external URL (e.g. S3 public URL), only redirect to trusted origins.
    // Unrestricted redirect would allow open-redirect phishing via /api/download?url=...
    if (url.startsWith('http://') || url.startsWith('https://')) {
        let origin;
        try {
            origin = new URL(url).origin;
        }
        catch {
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
        const cleanPath = path_1.default.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path_1.default.resolve(process.cwd(), cleanPath);
        // Ensure the file is inside the uploads directory
        const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
        if (!absolutePath.startsWith(uploadsDir)) {
            res.status(403).json({ error: 'Accès interdit.' });
            return;
        }
        if (!fs_1.default.existsSync(absolutePath)) {
            res.status(404).json({ error: 'Fichier introuvable.' });
            return;
        }
        // Force browser download
        res.download(absolutePath);
    }
    catch (error) {
        logger_1.logger.error('File download error:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement.' });
    }
};
exports.downloadFile = downloadFile;
//# sourceMappingURL=uploadController.js.map