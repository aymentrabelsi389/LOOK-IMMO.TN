const BASE_URL = 'http://localhost:5000/api';

const endpoints = [
    { name: 'Properties List', url: '/properties' },
    { name: 'Properties (page 1, limit 10)', url: '/properties?page=1&limit=10' },
    { name: 'Blog Posts', url: '/blog' },
    { name: 'Settings', url: '/settings' },
    { name: 'Health Check', url: '/health', fullUrl: 'http://localhost:5000/health' }
];

async function runAudit() {
    console.log('Starting API Performance Audit...\n');
    console.log('| Endpoint | Response Time (ms) | Status | Payload Size (KB) |');
    console.log('|----------|-------------------|--------|-------------------|');

    for (const endpoint of endpoints) {
        const url = endpoint.fullUrl || `${BASE_URL}${endpoint.url}`;
        const start = Date.now();
        try {
            const response = await fetch(url);
            const data = await response.json();
            const end = Date.now();
            const time = end - start;
            const size = (JSON.stringify(data).length / 1024).toFixed(2);
            console.log(`| ${endpoint.name} | ${time}ms | ${response.status} | ${size} KB |`);
        } catch (error: any) {
            console.log(`| ${endpoint.name} | ERROR | 500 | N/A |`);
        }
    }
    console.log('\nAudit Complete.');
}

runAudit();
