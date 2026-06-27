
const http = require('http');

// Helper to make requests
function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
                } catch (e) { console.log(data); resolve({ status: res.statusCode, body: data }); }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await request('POST', '/auth/login', {
            email: 'admin@test.com',
            password: 'password123'     // ✅ // Wait, I created user with 'hashedpassword' string as hash. Use that.
            // Wait, authController uses bcrypt.compare. 'hashedpassword' string won't compare to plain text unless I send the plain text that matches the hash.
            // I should create a user via API register to get a valid user/password pair.
        });

        // Actually, let's just create a new admin via register
        console.log('Registering/Login admin...');
        let token;
        const regRes = await request('POST', '/auth/register', {
            name: 'Test Admin',
            email: 'admin' + Date.now() + '@test.com',
            password: 'password123',
            phone: '12345678'
        });

        if (regRes.status === 201 || regRes.status === 200) {
            token = regRes.body.token;
            // Elevate to admin (hack: direct DB update or assume first user is admin? No)
            // I need admin role to update any property or be the owner.
            // The register gives me a user.
        } else {
            console.log('Register failed', regRes);
            return;
        }

        // 2. Create Property
        console.log('Creating property...');
        const createRes = await request('POST', '/properties', {
            title: "API Update Test",
            price: 2000,
            type: "sale",
            city: "Sousse",
            isFeatured: false
        }, token);

        const propId = createRes.body.id;
        console.log('Created Property:', propId);

        // 3. Update to isFeatured: true
        console.log('Updating isFeatured to true...');
        const updateRes = await request('PUT', '/properties/' + propId, {
            isFeatured: true
        }, token);
        console.log('Update Status:', updateRes.status);
        console.log('Update Body keys:', Object.keys(updateRes.body));
        console.log('Update Body isFeatured:', updateRes.body.isFeatured);

        // 4. Verify Fetch
        console.log('Verifying via Fetch...');
        const getRes = await request('GET', '/properties/' + propId, null, null);
        console.log('Get isFeatured:', getRes.body.isFeatured);

    } catch (e) {
        console.error(e);
    }
}

main();
