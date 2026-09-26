import {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
    ValidationError,
    TooManyRequestsError,
    InternalServerError,
    asyncHandler,
} from './index';
import { Request, Response, NextFunction } from 'express';

describe('Custom Error Hierarchy (AppError)', () => {
    describe('Base AppError', () => {
        it('should instantiate correctly with default isOperational = true', () => {
            const err = new AppError('Something went wrong', 503);
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(AppError);
            expect(err.message).toBe('Something went wrong');
            expect(err.statusCode).toBe(503);
            expect(err.isOperational).toBe(true);
            expect(err.stack).toBeDefined();
        });

        it('should allow setting isOperational = false for non-operational errors', () => {
            const err = new AppError('Fatal database crash', 500, false);
            expect(err.statusCode).toBe(500);
            expect(err.isOperational).toBe(false);
        });
    });

    describe('HTTP Domain Error Subclasses', () => {
        it('BadRequestError should have status 400', () => {
            const err = new BadRequestError('Invalid query');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(BadRequestError);
            expect(err.statusCode).toBe(400);
            expect(err.message).toBe('Invalid query');
        });

        it('UnauthorizedError should have status 401', () => {
            const err = new UnauthorizedError('Token expired');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(UnauthorizedError);
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('Token expired');
        });

        it('ForbiddenError should have status 403', () => {
            const err = new ForbiddenError('Admin only');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(ForbiddenError);
            expect(err.statusCode).toBe(403);
            expect(err.message).toBe('Admin only');
        });

        it('NotFoundError should have status 404', () => {
            const err = new NotFoundError('Property not found');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(NotFoundError);
            expect(err.statusCode).toBe(404);
            expect(err.message).toBe('Property not found');
        });

        it('ConflictError should have status 409', () => {
            const err = new ConflictError('Email already exists');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(ConflictError);
            expect(err.statusCode).toBe(409);
            expect(err.message).toBe('Email already exists');
        });

        it('PayloadTooLargeError should have status 413', () => {
            const err = new PayloadTooLargeError('File exceeds 10MB limit');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(PayloadTooLargeError);
            expect(err.statusCode).toBe(413);
            expect(err.message).toBe('File exceeds 10MB limit');
        });

        it('UnsupportedMediaTypeError should have status 415', () => {
            const err = new UnsupportedMediaTypeError('Only WebP supported');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(UnsupportedMediaTypeError);
            expect(err.statusCode).toBe(415);
            expect(err.message).toBe('Only WebP supported');
        });

        it('ValidationError should have status 422 and structured details', () => {
            const details = [{ path: 'price', message: 'Price must be a positive number' }];
            const err = new ValidationError('Validation failed', details);
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(ValidationError);
            expect(err.statusCode).toBe(422);
            expect(err.details).toEqual(details);
        });

        it('TooManyRequestsError should have status 429', () => {
            const err = new TooManyRequestsError('Too many attempts');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(TooManyRequestsError);
            expect(err.statusCode).toBe(429);
        });

        it('InternalServerError should have status 500 and isOperational = false', () => {
            const err = new InternalServerError('Database connection lost');
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(InternalServerError);
            expect(err.statusCode).toBe(500);
            expect(err.isOperational).toBe(false);
        });
    });

    describe('asyncHandler wrapper', () => {
        let mockReq: Partial<Request>;
        let mockRes: Partial<Response>;
        let mockNext: jest.Mock;

        beforeEach(() => {
            mockReq = {};
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
            mockNext = jest.fn();
        });

        it('should execute asynchronous route logic successfully', async () => {
            const handler = asyncHandler(async (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });

            await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should forward thrown AppError to next() when next is provided', async () => {
            const handler = asyncHandler(async () => {
                throw new NotFoundError('Item not found');
            });

            await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
        });

        it('should rethrow error when next is not provided (e.g. direct test calls)', async () => {
            const handler = asyncHandler(async () => {
                throw new BadRequestError('Bad input');
            });

            await expect(handler(mockReq as Request, mockRes as Response)).rejects.toThrow('Bad input');
        });
    });
});
