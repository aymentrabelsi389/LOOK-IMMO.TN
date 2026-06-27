const BASE_URL = 'http://localhost:5000/api';

const endpoints = [
    { name: 'Properties List', url: '/properties' },
    { name: 'Properties (page 1, limit 10)', url: '/properties?page=1&limit=10' },
    { name: 'Blog Posts', url: '/blog' },
    { name: 'Settings', url: '/settings' },
    { name: 'Health Check', url: '/health', fullUrl: 'http://localhost:5000/health' }
];

async function runAudit() {
    console.log('--- PERFORMANCE AUDIT RESULTS ---\n');
    console.log('Endpoint | Time (ms) | Status | Size (KB)');
    console.log('-------------------------------------------');

    for (const endpoint of endpoints) {
        const url = endpoint.fullUrl || `${BASE_URL}${endpoint.url}`;
        const start = Date.now();
        try {
            const response = await fetch(url);
            const data = await response.json();
            const end = Date.now();
            const time = end - start;
            const size = (JSON.stringify(data).length / 1024).toFixed(2);
            console.log(`${endpoint.name.padEnd(25)} | ${time.toString().padStart(5)}ms | ${response.status} | ${size} KB`);
        } catch (error) {
            console.log(`${endpoint.name.padEnd(25)} | ERROR   | 500 | N/A`);
        }
    }
    console.log('\nAudit Complete.');
}

runAudit();
