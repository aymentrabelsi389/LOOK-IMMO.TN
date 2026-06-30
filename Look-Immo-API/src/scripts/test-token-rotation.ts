import http from 'http';
import jwt from 'jsonwebtoken';

const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

const makeRequest = (path: string, method: string, headers: Record<string, string>, body?: any): Promise<{ status: number; headers: any; body: string }> => {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: resBody }));
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const extractCookie = (headers: any, name: string): string | null => {
    const cookies = headers['set-cookie'] as string[] | undefined;
    if (!cookies) return null;
    const cookie = cookies.find(c => c.startsWith(name + '='));
    if (!cookie) return null;
    return cookie.split(';')[0].split('=')[1];
};

async function run() {
    console.log("=== Step 1: Login to establish token family ===");
    // Set headers Origin to pass CSRF guard
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
        'Origin': 'http://localhost:3000'
    }, {
        email: 'admin@lookimmo.tn',
        password: 'password123'
    });

    const rt1 = extractCookie(loginRes.headers, 'refresh_token');
    console.log(`Initial Refresh Token (rt1): ${rt1 ? 'Extracted' : 'Missing'}`);
    if (!rt1) return;

    // Decode rt1 to inspect tokenId and familyId
    const payload1 = jwt.decode(rt1) as { token?: string; familyId?: string };
    console.log(`rt1 Payload -> tokenId: ${payload1.token}, familyId: ${payload1.familyId}`);

    console.log("\n=== Step 2: First Refresh (Should rotate rt1 -> rt2) ===");
    const refreshRes1 = await makeRequest('/api/auth/refresh', 'POST', {
        'Origin': 'http://localhost:3000',
        'Cookie': `refresh_token=${rt1}`
    });

    const rt2 = extractCookie(refreshRes1.headers, 'refresh_token');
    console.log(`Status: ${refreshRes1.status}, Body: ${refreshRes1.body}`);
    console.log(`New Refresh Token (rt2): ${rt2 ? 'Extracted' : 'Missing'}`);
    if (!rt2) return;

    const payload2 = jwt.decode(rt2) as { token?: string; familyId?: string };
    console.log(`rt2 Payload -> tokenId: ${payload2.token}, familyId: ${payload2.familyId}`);
    console.log(`Family IDs match: ${payload1.familyId === payload2.familyId ? 'Yes' : 'No'}`);
    console.log(`Token IDs differ: ${payload1.token !== payload2.token ? 'Yes' : 'No'}`);

    console.log("\n=== Step 3: Reuse rt1 (Detect Compromise & Revoke Entire Family) ===");
    const reuseRes = await makeRequest('/api/auth/refresh', 'POST', {
        'Origin': 'http://localhost:3000',
        'Cookie': `refresh_token=${rt1}`
    });
    console.log(`Status: ${reuseRes.status}, Body: ${reuseRes.body}`);

    console.log("\n=== Step 4: Verify rt2 is now revoked/invalid ===");
    const verifyRes = await makeRequest('/api/auth/refresh', 'POST', {
        'Origin': 'http://localhost:3000',
        'Cookie': `refresh_token=${rt2}`
    });
    console.log(`Status: ${verifyRes.status}, Body: ${verifyRes.body}`);
}

// We need the server to be running to test this.
run();
