"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = exports.handleDocumentUpload = exports.handleImageUpload = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * POST /api/upload/image
 *
 * Called after `uploadImage.single('image')` and `optimizeAndSave(...)` middleware.
 * By the time we reach here, Sharp has already compressed the image and
 * req.optimizedPath holds the public URL path (e.g. /uploads/properties/xxx.webp).
 */
const handleImageUpload = (req, res) => {
    const optimizedPath = req.optimizedPath;
    if (!optimizedPath) {
        res.status(400).json({ error: 'No image was uploaded or optimization failed.' });
        return;
    }
    res.status(201).json({
        url: optimizedPath,
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
const handleDocumentUpload = (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Aucun fichier reçu.' });
        return;
    }
    // Strictly enforce PDF format
    if (req.file.mimetype !== 'application/pdf') {
        if (fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(400).json({ error: 'Seuls les fichiers PDF sont autorisés.' });
        return;
    }
    const fileUrl = `/uploads/contracts/${req.file.filename}`;
    res.status(201).json({
        url: fileUrl,
        message: 'Document mis en ligne avec succès',
    });
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
        console.error('File download error:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement.' });
    }
};
exports.downloadFile = downloadFile;
//# sourceMappingURL=uploadController.js.map