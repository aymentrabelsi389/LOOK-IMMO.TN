const http = require('http');

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: method,
            headers: {}
        };
        if (body) options.headers['Content-Type'] = 'application/json';
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    // 1. Log in as admin
    const loginRes = await request('POST', '/auth/login', {
        email: 'admin@lookimmo.com',
        password: 'admin123'
    });
    
    if (loginRes.status !== 200) {
        console.log('Login failed', loginRes.status, loginRes.body);
        return;
    }
    
    const token = JSON.parse(loginRes.body).token;
    console.log('Logged in successfully');

    // 2. Get properties
    const propsRes = await request('GET', '/properties', null, token);
    const properties = JSON.parse(propsRes.body);
    
    if (properties.length === 0) {
        console.log('No properties to delete.');
        return;
    }
    
    const propId = properties[0].id; // Delete the first one
    console.log(`Attempting to delete property: ${propId}`);

    // 3. Delete property
    const deleteRes = await request('DELETE', `/properties/${propId}`, null, token);
    console.log('Delete Response:', deleteRes.status, deleteRes.body);
}

main();
