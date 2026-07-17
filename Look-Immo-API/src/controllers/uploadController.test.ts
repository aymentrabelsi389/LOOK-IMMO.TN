import { downloadFile } from './uploadController';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('../utils/upload', () => ({ uploadFileToStorage: jest.fn() }));

describe('uploadController downloadFile — open-redirect fix', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json:   jest.fn().mockReturnThis(),
            redirect: jest.fn(),
            download: jest.fn(),
        };
    });

    // ── External URL tests ──────────────────────────────────────────────────────

    it('should return 403 when the redirect target is an untrusted external domain', async () => {
        // No S3_PUBLIC_URL / S3_ENDPOINT / BACKEND_URL set in test env → allowlist is empty
        delete process.env.S3_PUBLIC_URL;
        delete process.env.S3_ENDPOINT;
        delete process.env.BACKEND_URL;

        mockReq = { query: { url: 'https://phishing-site.com/steal' } };

        downloadFile(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Redirect vers une URL non autorisée.' });
        expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should return 403 for http:// phishing URLs', async () => {
        delete process.env.S3_PUBLIC_URL;
        delete process.env.S3_ENDPOINT;
        delete process.env.BACKEND_URL;

        mockReq = { query: { url: 'http://evil.example.com' } };

        downloadFile(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect when the origin matches S3_PUBLIC_URL', async () => {
        process.env.S3_PUBLIC_URL = 'https://cdn.look-immo.tn';

        // Re-import to pick up the new env var (module-level constant is built on load,
        // so we use jest.resetModules to force a fresh load)
        jest.resetModules();
        const { downloadFile: freshDownloadFile } = await import('./uploadController');

        const res: Partial<Response> = {
            status: jest.fn().mockReturnThis(),
            json:   jest.fn().mockReturnThis(),
            redirect: jest.fn(),
            download: jest.fn(),
        };

        const req: Partial<Request> = {
            query: { url: 'https://cdn.look-immo.tn/properties/image.webp' }
        };

        freshDownloadFile(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith('https://cdn.look-immo.tn/properties/image.webp');
        expect(res.status).not.toHaveBeenCalledWith(403);

        delete process.env.S3_PUBLIC_URL;
    });

    it('should return 400 for a malformed URL', () => {
        mockReq = { query: { url: 'http://[invalid' } };

        downloadFile(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'URL invalide.' });
        expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    // ── Local file tests ────────────────────────────────────────────────────────

    it('should return 400 when no url is provided', () => {
        mockReq = { query: {} };

        downloadFile(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "L'URL du fichier est requise." });
    });

    it('should return 403 for path traversal attempts', () => {
        mockReq = { query: { url: '../../etc/passwd' } };
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        downloadFile(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Accès interdit.' });
    });
});
