"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticated = exports.clientOnly = exports.agentOrAdmin = exports.agentOnly = exports.adminOnly = exports.roleGuard = void 0;
const roleGuard = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.roleGuard = roleGuard;
// Shorthand guards
exports.adminOnly = (0, exports.roleGuard)('admin');
exports.agentOnly = (0, exports.roleGuard)('agent');
exports.agentOrAdmin = (0, exports.roleGuard)('admin', 'agent');
exports.clientOnly = (0, exports.roleGuard)('client');
exports.authenticated = (0, exports.roleGuard)('admin', 'agent', 'client');
//# sourceMappingURL=roleGuard.js.map