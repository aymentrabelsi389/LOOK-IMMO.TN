import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';

const router = Router();

// Serve raw OpenAPI JSON specification
router.get('/api-docs/json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
});

// Serve interactive Swagger UI documentation
router.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info { margin-bottom: 24px }
            .swagger-ui .scheme-container { background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px }
        `,
        customSiteTitle: 'LOOK IMMO API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
        },
    })
);

export { router as swaggerRoutes, openApiSpec };
