
const http = require('http');

http.get('http://localhost:5000/api/properties', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const props = JSON.parse(data);
            const p = props.find(x => x.title === "Test Feature Persistence");
            console.log('isFeatured:', p ? p.isFeatured : 'Not Found');
            console.log('All Keys:', p ? Object.keys(p) : []);
        } catch (e) { console.log(data); }
    });
}).on('error', (err) => console.error(err));
