import { requestContextStore, getRequestContext } from './requestContext';

describe('RequestContext Utilities', () => {
    it('should return empty object if context is not active', () => {
        expect(getRequestContext()).toEqual({});
    });

    it('should correctly propagate requestId and userId inside run callback', () => {
        const mockContext = { requestId: 'test-req-id', userId: 'test-user-id' };
        
        requestContextStore.run(mockContext, () => {
            const currentContext = getRequestContext();
            expect(currentContext.requestId).toBe('test-req-id');
            expect(currentContext.userId).toBe('test-user-id');
        });
    });
});
