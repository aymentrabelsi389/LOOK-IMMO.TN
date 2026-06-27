
const fetch = require('node-fetch');

async function main() {
    try {
        const response = await fetch('http://localhost:5000/api/properties');
        const properties = await response.json();

        console.log('Count:', properties.length);
        if (properties.length > 0) {
            const prop = properties.find(p => p.title === 'Test Feature Persistence') || properties[0];
            console.log('Property ID:', prop.id);
            console.log('isFeatured:', prop.isFeatured);
            console.log('Keys:', Object.keys(prop));
        }

    } catch (e) {
        console.error(e);
    }
}

main();
