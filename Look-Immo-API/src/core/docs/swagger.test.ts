import { openApiSpec } from './openapi';

describe('Swagger & OpenAPI 3.0 Documentation', () => {
    it('should have valid OpenAPI 3.0.0 metadata', () => {
        expect(openApiSpec.openapi).toBe('3.0.0');
        expect(openApiSpec.info.title).toContain('LOOK-IMMO');
        expect(openApiSpec.info.version).toBe('1.0.0');
        expect(openApiSpec.servers).toBeDefined();
        expect(openApiSpec.servers.length).toBeGreaterThan(0);
    });

    it('should declare all core domain tags', () => {
        const tagNames = openApiSpec.tags.map((t: any) => t.name);
        expect(tagNames).toContain('Auth');
        expect(tagNames).toContain('Properties');
        expect(tagNames).toContain('Users');
        expect(tagNames).toContain('Appointments');
        expect(tagNames).toContain('Stats');
        expect(tagNames).toContain('Exchange Rates');
        expect(tagNames).toContain('Uploads');
    });

    it('should define JWT authentication and cookie security schemes', () => {
        expect(openApiSpec.components.securitySchemes.cookieAuth).toBeDefined();
        expect(openApiSpec.components.securitySchemes.cookieAuth.type).toBe('apiKey');
        expect(openApiSpec.components.securitySchemes.cookieAuth.name).toBe('access_token');

        expect(openApiSpec.components.securitySchemes.bearerAuth).toBeDefined();
        expect(openApiSpec.components.securitySchemes.bearerAuth.type).toBe('http');
        expect(openApiSpec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    });

    it('should contain paths for critical REST endpoints', () => {
        const paths = Object.keys(openApiSpec.paths);
        expect(paths).toContain('/api/auth/register');
        expect(paths).toContain('/api/auth/login');
        expect(paths).toContain('/api/auth/refresh');
        expect(paths).toContain('/api/properties');
        expect(paths).toContain('/api/properties/{id}');
        expect(paths).toContain('/api/appointments');
        expect(paths).toContain('/api/stats/dashboard');
        expect(paths).toContain('/api/exchange-rates');
        expect(paths).toContain('/api/upload/image');
    });
});
