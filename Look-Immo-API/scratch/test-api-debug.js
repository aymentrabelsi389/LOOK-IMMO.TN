const http = require('http');

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
                resolve({ status: res.statusCode, body: data });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    let token;
    const regRes = await request('POST', '/auth/register', {
        name: 'Debug User',
        email: 'debug' + Date.now() + '@test.com',
        password: 'password123'
    });
    
    if (regRes.status !== 201 && regRes.status !== 200) {
        console.log('Register failed', regRes.status, regRes.body);
        return;
    }
    
    token = JSON.parse(regRes.body).token;
    console.log('Got token');

    const createRes = await request('POST', '/properties', {
        title: "API Update Test",
        price: 2000,
        type: "sale",
        city: "Sousse"
    }, token);

    console.log('Create Response:', createRes.status, createRes.body);
}

main();
