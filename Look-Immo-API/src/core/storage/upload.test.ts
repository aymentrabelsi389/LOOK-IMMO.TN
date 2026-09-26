import { detectMimeFromMagicBytes, assertMagicBytes } from './upload';
import { Request, Response, NextFunction } from 'express';

// ─── detectMimeFromMagicBytes ────────────────────────────────────────────────

describe('detectMimeFromMagicBytes', () => {
    it('detects JPEG from FF D8 FF magic bytes', () => {
        const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
        expect(detectMimeFromMagicBytes(buf)).toBe('image/jpeg');
    });

    it('detects PNG from 89 50 4E 47 ... magic bytes', () => {
        const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
        expect(detectMimeFromMagicBytes(buf)).toBe('image/png');
    });

    it('detects WebP from RIFF....WEBP magic bytes', () => {
        const buf = Buffer.alloc(12);
        buf.write('RIFF', 0, 'ascii');   // bytes 0-3
        buf.writeUInt32LE(0, 4);          // bytes 4-7 (file size — irrelevant)
        buf.write('WEBP', 8, 'ascii');   // bytes 8-11
        expect(detectMimeFromMagicBytes(buf)).toBe('image/webp');
    });

    it('detects HEIC from ftyp + heic brand', () => {
        const buf = Buffer.alloc(16);
        buf.writeUInt32BE(0, 0);          // box size (irrelevant)
        buf.write('ftyp', 4, 'ascii');   // bytes 4-7
        buf.write('heic', 8, 'ascii');   // bytes 8-11 (brand)
        expect(detectMimeFromMagicBytes(buf)).toBe('image/heic');
    });

    it('detects HEIF from ftyp + mif1 brand', () => {
        const buf = Buffer.alloc(16);
        buf.write('ftyp', 4, 'ascii');
        buf.write('mif1', 8, 'ascii');
        expect(detectMimeFromMagicBytes(buf)).toBe('image/heic');
    });

    it('detects PDF from %PDF- magic bytes', () => {
        const buf = Buffer.from('%PDF-1.4 ...', 'ascii');
        expect(detectMimeFromMagicBytes(buf)).toBe('application/pdf');
    });

    it('returns null for an SVG (text-based, no magic bytes)', () => {
        const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');
        expect(detectMimeFromMagicBytes(buf)).toBeNull();
    });

    it('returns null for arbitrary unknown bytes', () => {
        const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
        expect(detectMimeFromMagicBytes(buf)).toBeNull();
    });

    it('returns null for a buffer shorter than 4 bytes', () => {
        const buf = Buffer.from([0xFF, 0xD8]);
        expect(detectMimeFromMagicBytes(buf)).toBeNull();
    });

    it('returns null for ftyp box with unrecognised brand (not heic/heif)', () => {
        const buf = Buffer.alloc(16);
        buf.write('ftyp', 4, 'ascii');
        buf.write('mp41', 8, 'ascii'); // MP4, not HEIC
        expect(detectMimeFromMagicBytes(buf)).toBeNull();
    });
});

// ─── assertMagicBytes middleware ─────────────────────────────────────────────

describe('assertMagicBytes middleware', () => {
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    it('calls next() immediately when no file is present', () => {
        const req = { } as Request;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('calls next() when magic bytes match declared MIME type (JPEG)', () => {
        const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
        const req = { file: { buffer: jpegBuffer, mimetype: 'image/jpeg' } } as any;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('calls next() when image/jpg alias matches JPEG bytes', () => {
        const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
        const req = { file: { buffer: jpegBuffer, mimetype: 'image/jpg' } } as any;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('returns 415 when bytes do not match any known type (e.g. SVG disguised as jpeg)', () => {
        const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
        const req = { file: { buffer: svgBuffer, mimetype: 'image/jpeg' } } as any;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(415);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Type de fichier non reconnu ou non autorisé.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 415 when MIME header is spoofed (PNG bytes declared as image/jpeg)', () => {
        const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const req = { file: { buffer: pngBuffer, mimetype: 'image/jpeg' } } as any;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(415);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Le contenu du fichier ne correspond pas au type déclaré.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('calls next() when PDF bytes match application/pdf MIME type', () => {
        const pdfBuffer = Buffer.from('%PDF-1.4 fake', 'ascii');
        const req = { file: { buffer: pdfBuffer, mimetype: 'application/pdf' } } as any;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('returns 415 when PDF bytes are declared as image/jpeg (spoofed type)', () => {
        const pdfBuffer = Buffer.from('%PDF-1.4 fake', 'ascii');
        const req = { file: { buffer: pdfBuffer, mimetype: 'image/jpeg' } } as any;
        assertMagicBytes()(req, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(415);
        expect(mockNext).not.toHaveBeenCalled();
    });
});
