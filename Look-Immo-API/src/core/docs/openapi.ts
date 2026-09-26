/**
 * Complete OpenAPI 3.0.0 Specification for LOOK-IMMO REST API.
 * Generated and synchronized with Zod validation schemas and route definitions.
 */

export const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'LOOK-IMMO API Documentation',
        version: '1.0.0',
        description: 'Production REST API for LOOK IMMO — Real Estate SaaS Platform in Tunisia. Provides endpoints for property management, user administration, appointments, notifications, analytics, exchange rates, and interactive features.',
        contact: {
            name: 'LOOK IMMO Engineering',
            url: 'https://look-immo.tn',
            email: 'contact@look-immo.tn',
        },
    },
    servers: [
        {
            url: process.env.BACKEND_URL || 'http://localhost:5000',
            description: 'Current Environment API Server',
        },
    ],
    tags: [
        { name: 'Auth', description: 'Authentication, registration, sessions, and password recovery' },
        { name: 'Properties', description: 'Real estate properties, filtering, search, and admin reordering' },
        { name: 'Users', description: 'User profile and account administration' },
        { name: 'Appointments', description: 'Property visit scheduling and management' },
        { name: 'Demands', description: 'Client property search requests and criteria matching' },
        { name: 'Visits', description: 'Physical property inspection records' },
        { name: 'Messages', description: 'Direct inquiries and client messaging' },
        { name: 'Favorites', description: 'User saved properties and bookmarking' },
        { name: 'Ratings', description: 'Property reviews and feedback' },
        { name: 'Notifications', description: 'Real-time alert notifications and read statuses' },
        { name: 'Stats', description: 'Platform analytics, visit tracking, and performance metrics' },
        { name: 'Locations', description: 'Tunisian governorates, cities, and neighborhood listings' },
        { name: 'Blog', description: 'Real estate articles and market news' },
        { name: 'Settings', description: 'Platform configuration, SEO metadata, and contact info' },
        { name: 'Exchange Rates', description: 'TND live exchange rates and currency conversion' },
        { name: 'Uploads', description: 'File uploads, Sharp WebP compression, and document storage' },
    ],
    components: {
        securitySchemes: {
            cookieAuth: {
                type: 'apiKey',
                in: 'cookie',
                name: 'access_token',
                description: 'HTTP-only secure JWT access token cookie.',
            },
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Bearer authorization header containing valid JWT access token.',
            },
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Resource not found' },
                    details: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                path: { type: 'string', example: 'price' },
                                message: { type: 'string', example: 'Price must be positive' },
                            },
                        },
                    },
                },
                required: ['error'],
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string', example: 'Aymen Trabelsi' },
                    email: { type: 'string', format: 'email', example: 'aymen@example.com' },
                    role: { type: 'string', enum: ['admin', 'agent', 'client'], example: 'client' },
                    phone: { type: 'string', nullable: true, example: '+216 20 000 000' },
                    avatar: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            Property: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string', example: 'Villa Moderne avec Piscine' },
                    description: { type: 'string' },
                    price: { type: 'number', example: 450000 },
                    priceType: { type: 'string', enum: ['total', 'per_m2'], default: 'total' },
                    type: { type: 'string', enum: ['sale', 'rent'], example: 'sale' },
                    category: { type: 'string', enum: ['apartment', 'villa', 'land', 'commercial', 'office'], default: 'apartment' },
                    city: { type: 'string', example: 'Tunis' },
                    zone: { type: 'string', nullable: true, example: 'Les Berges du Lac 2' },
                    status: { type: 'string', enum: ['available', 'reserved', 'sold', 'rented'], default: 'available' },
                    images: { type: 'array', items: { type: 'string' } },
                    features: { type: 'object', additionalProperties: true },
                    isFeatured: { type: 'boolean', default: false },
                    isNew: { type: 'boolean', default: false },
                    isHotDeal: { type: 'boolean', default: false },
                    displayOrder: { type: 'integer', example: 1 },
                    latitude: { type: 'number', nullable: true, example: 36.837 },
                    longitude: { type: 'number', nullable: true, example: 10.237 },
                    ownerPhone: { type: 'string', nullable: true },
                    ownerId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            RegisterInput: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                    name: { type: 'string', minLength: 2, maxLength: 50, example: 'Aymen' },
                    email: { type: 'string', format: 'email', example: 'user@look-immo.tn' },
                    password: { type: 'string', minLength: 8, example: 'SecurePassword123' },
                    phone: { type: 'string', example: '+216 20 123 456' },
                },
            },
            LoginInput: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'user@look-immo.tn' },
                    password: { type: 'string', minLength: 1, example: 'SecurePassword123' },
                },
            },
            ForgotPasswordInput: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'user@look-immo.tn' },
                },
            },
            VerifyResetCodeInput: {
                type: 'object',
                required: ['email', 'code'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
                },
            },
            ResetPasswordInput: {
                type: 'object',
                required: ['email', 'code', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
                    password: { type: 'string', minLength: 8, example: 'NewSecurePassword123' },
                },
            },
            CreatePropertyInput: {
                type: 'object',
                required: ['title', 'price', 'type', 'city'],
                properties: {
                    title: { type: 'string', example: 'Bel Appartement S+2' },
                    description: { type: 'string', example: 'Très bel appartement bien ensoleillé...' },
                    price: { type: 'number', example: 280000 },
                    priceType: { type: 'string', enum: ['total', 'per_m2'], default: 'total' },
                    type: { type: 'string', enum: ['sale', 'rent'], example: 'sale' },
                    category: { type: 'string', enum: ['apartment', 'villa', 'land', 'commercial', 'office'], default: 'apartment' },
                    city: { type: 'string', example: 'Ariana' },
                    zone: { type: 'string', example: 'Ennasr 2' },
                    status: { type: 'string', enum: ['available', 'reserved', 'sold', 'rented'], default: 'available' },
                    images: { type: 'array', items: { type: 'string' } },
                    features: { type: 'object' },
                    isFeatured: { type: 'boolean', default: false },
                    isNew: { type: 'boolean', default: false },
                    isHotDeal: { type: 'boolean', default: false },
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                    ownerPhone: { type: 'string' },
                },
            },
            CreateAppointmentInput: {
                type: 'object',
                required: ['propertyId', 'date', 'clientName', 'clientPhone'],
                properties: {
                    propertyId: { type: 'string' },
                    date: { type: 'string', format: 'date-time' },
                    clientName: { type: 'string' },
                    clientPhone: { type: 'string' },
                    clientEmail: { type: 'string', format: 'email' },
                    notes: { type: 'string' },
                },
            },
            CreateDemandInput: {
                type: 'object',
                required: ['clientName', 'clientPhone', 'type', 'category', 'city'],
                properties: {
                    clientName: { type: 'string' },
                    clientPhone: { type: 'string' },
                    clientEmail: { type: 'string', format: 'email' },
                    type: { type: 'string', enum: ['sale', 'rent'] },
                    category: { type: 'string' },
                    city: { type: 'string' },
                    minPrice: { type: 'number' },
                    maxPrice: { type: 'number' },
                    minBedrooms: { type: 'integer' },
                    minArea: { type: 'number' },
                    notes: { type: 'string' },
                },
            },
        },
    },
    paths: {
        '/api/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register a new user account',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
                },
                responses: {
                    201: { description: 'Registration successful. Sets access and refresh cookies.' },
                    400: { description: 'Validation failed or email already registered.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Authenticate with email and password',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
                },
                responses: {
                    200: { description: 'Login successful. Sets HTTP-only cookies.' },
                    400: { description: 'Invalid credentials or missing fields.' },
                },
            },
        },
        '/api/auth/logout': {
            post: {
                tags: ['Auth'],
                summary: 'Logout user and revoke refresh token session',
                responses: {
                    200: { description: 'Successfully logged out.' },
                },
            },
        },
        '/api/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Get current authenticated user profile',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: {
                    200: { description: 'Current user profile data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { description: 'Unauthorized — not logged in.' },
                },
            },
        },
        '/api/auth/refresh': {
            post: {
                tags: ['Auth'],
                summary: 'Rotate refresh token and issue new access token',
                responses: {
                    200: { description: 'Tokens rotated successfully.' },
                    401: { description: 'Invalid or expired refresh token.' },
                },
            },
        },
        '/api/auth/forgot-password': {
            post: {
                tags: ['Auth'],
                summary: 'Request 6-digit password reset verification code via email queue',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordInput' } } },
                },
                responses: {
                    200: { description: 'Reset code generated and enqueued.' },
                    400: { description: 'User not found or invalid email.' },
                },
            },
        },
        '/api/auth/verify-reset-code': {
            post: {
                tags: ['Auth'],
                summary: 'Verify 6-digit password reset code',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyResetCodeInput' } } },
                },
                responses: {
                    200: { description: 'Code is valid.' },
                    400: { description: 'Code invalid, expired, or maximum attempts exceeded.' },
                },
            },
        },
        '/api/auth/reset-password': {
            post: {
                tags: ['Auth'],
                summary: 'Reset password and revoke all active sessions',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordInput' } } },
                },
                responses: {
                    200: { description: 'Password reset successfully.' },
                    400: { description: 'Code invalid or expired.' },
                },
            },
        },
        '/api/properties': {
            get: {
                tags: ['Properties'],
                summary: 'List and filter properties with pagination & Redis caching',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 24 } },
                    { name: 'type', in: 'query', schema: { type: 'string', enum: ['sale', 'rent'] } },
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                    { name: 'city', in: 'query', schema: { type: 'string' } },
                    { name: 'minPrice', in: 'query', schema: { type: 'number' } },
                    { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                    { name: 'isHotDeal', in: 'query', schema: { type: 'boolean' } },
                    { name: 'noLimit', in: 'query', schema: { type: 'boolean' }, description: 'Admin/Agent only: fetch un-paginated properties' },
                ],
                responses: {
                    200: { description: 'Paginated list of properties.' },
                },
            },
            post: {
                tags: ['Properties'],
                summary: 'Create a new real estate property',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePropertyInput' } } },
                },
                responses: {
                    201: { description: 'Property created successfully.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Property' } } } },
                    400: { description: 'Missing required fields.' },
                    401: { description: 'Authentication required.' },
                    403: { description: 'Insufficient permissions.' },
                },
            },
        },
        '/api/properties/{id}': {
            get: {
                tags: ['Properties'],
                summary: 'Get property details by ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Property details.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Property' } } } },
                    404: { description: 'Property not found.' },
                },
            },
            put: {
                tags: ['Properties'],
                summary: 'Update property details',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Property updated.' },
                    403: { description: 'Not authorized to edit this property.' },
                    404: { description: 'Property not found.' },
                },
            },
            delete: {
                tags: ['Properties'],
                summary: 'Delete property',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Property deleted.' },
                    403: { description: 'Not authorized.' },
                    404: { description: 'Property not found.' },
                },
            },
        },
        '/api/properties/reorder': {
            put: {
                tags: ['Properties'],
                summary: 'Bulk update property display orders (Admin only)',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: {
                    200: { description: 'Display orders updated.' },
                    403: { description: 'Admin access required.' },
                },
            },
        },
        '/api/properties/{id}/order': {
            patch: {
                tags: ['Properties'],
                summary: 'Move property position in catalog (Admin only)',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Property moved.' },
                    403: { description: 'Admin access required.' },
                },
            },
        },
        '/api/appointments': {
            get: {
                tags: ['Appointments'],
                summary: 'Get scheduled appointments',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { 200: { description: 'List of appointments.' } },
            },
            post: {
                tags: ['Appointments'],
                summary: 'Book a property visit appointment',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppointmentInput' } } },
                },
                responses: { 201: { description: 'Appointment created.' } },
            },
        },
        '/api/demands': {
            get: {
                tags: ['Demands'],
                summary: 'Get client real estate search demands',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { 200: { description: 'List of demands.' } },
            },
            post: {
                tags: ['Demands'],
                summary: 'Submit a property search demand',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateDemandInput' } } },
                },
                responses: { 201: { description: 'Demand submitted.' } },
            },
        },
        '/api/stats/dashboard': {
            get: {
                tags: ['Stats'],
                summary: 'Get comprehensive admin dashboard analytics (Admin only)',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { 200: { description: 'Platform statistics and KPIs.' } },
            },
        },
        '/api/stats/visit': {
            post: {
                tags: ['Stats'],
                summary: 'Track page visit with Redis batch buffering',
                responses: { 200: { description: 'Visit buffered.' } },
            },
        },
        '/api/exchange-rates': {
            get: {
                tags: ['Exchange Rates'],
                summary: 'Get current TND currency exchange rates (EUR, USD, CAD, GBP, SAR, AED, QAR)',
                responses: {
                    200: { description: 'Live exchange rates from Redis cache.' },
                },
            },
        },
        '/api/upload/image': {
            post: {
                tags: ['Uploads'],
                summary: 'Upload and compress property image to Sharp WebP format',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
                },
                responses: {
                    201: { description: 'Image uploaded and converted to responsive WebP srcset.' },
                    400: { description: 'No image uploaded or optimization failed.' },
                    415: { description: 'Invalid file MIME magic bytes.' },
                },
            },
        },
        '/api/upload/property-document': {
            post: {
                tags: ['Uploads'],
                summary: 'Upload contract or property PDF document',
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
                },
                responses: {
                    201: { description: 'Document uploaded successfully.' },
                    400: { description: 'Only PDF documents allowed.' },
                },
            },
        },
    },
};
