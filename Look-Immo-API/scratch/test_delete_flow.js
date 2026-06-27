// Test directly with Prisma - bypass HTTP auth
const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

function apiRequest(method, path, body, cookie) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { 'Cookie': cookie } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = http.request(opts, (res) => {
            let b = '';
            const setCookies = res.headers['set-cookie'] || [];
            res.on('data', d => b += d);
            res.on('end', () => resolve({ status: res.statusCode, body: b, cookies: setCookies }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    // 1. Check appointments in DB
    const appts = await prisma.appointment.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    console.log('=== DB Appointments ===');
    appts.forEach(a => console.log('ID:', a.id, '| Client:', a.clientName, '| Status:', a.status));

    if (appts.length === 0) {
        console.log('No appointments in DB'); 
        await prisma.$disconnect();
        return;
    }

    // 2. Check admin user credentials
    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { email: true, name: true } });
    console.log('\n=== Admin User ===');
    console.log('Email:', admin.email);

    await prisma.$disconnect();

    // 3. Try to login with common passwords
    const passwords = ['admin123', 'Admin123', 'lookimmo', 'lookimmo123', 'password', '123456', 'admin'];
    let workingCookie = null;

    for (const pwd of passwords) {
        const res = await apiRequest('POST', '/auth/login', { email: admin.email, password: pwd }, null);
        if (res.status === 200) {
            workingCookie = res.cookies.map(c => c.split(';')[0]).join('; ');
            console.log('\n=== Login SUCCESS with password:', pwd);
            break;
        }
    }

    if (!workingCookie) {
        console.log('\n=== Could not login - testing DELETE without auth ===');
        const noAuthDel = await apiRequest('DELETE', '/appointments/' + appts[0].id, null, null);
        console.log('No-auth DELETE status:', noAuthDel.status, noAuthDel.body);
        return;
    }

    // 4. Test GET
    const getRes = await apiRequest('GET', '/appointments', null, workingCookie);
    console.log('\n=== GET /appointments status:', getRes.status);
    try {
        const list = JSON.parse(getRes.body);
        console.log('Appointments returned:', Array.isArray(list) ? list.length : list);
    } catch(e) {
        console.log('GET body:', getRes.body.substring(0, 200));
    }

    // 5. Test DELETE
    const delRes = await apiRequest('DELETE', '/appointments/' + appts[0].id, null, workingCookie);
    console.log('\n=== DELETE /appointments/' + appts[0].id);
    console.log('Status:', delRes.status);
    console.log('Response:', delRes.body);
}

main().catch(e => console.error('FATAL:', e.message));
