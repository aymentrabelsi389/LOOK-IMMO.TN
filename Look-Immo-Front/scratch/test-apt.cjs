const http = require('http');

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(loginOptions, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Login:', data);
    const cookie = res.headers['set-cookie'];
    if (!cookie) { console.log('No cookie'); return; }
    
    const getOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/appointments',
      method: 'GET',
      headers: { 'Cookie': cookie }
    };
    http.request(getOptions, getRes => {
      let getData = '';
      getRes.on('data', chunk => getData += chunk);
      getRes.on('end', () => {
        const apts = JSON.parse(getData);
        if (apts.length > 0) {
          const id = apts[0].id;
          console.log('Updating apt:', id);
          const putOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/appointments/' + id,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
          };
          const putReq = http.request(putOptions, putRes => {
            let putData = '';
            putRes.on('data', chunk => putData += chunk);
            putRes.on('end', () => {
              console.log('PUT status:', putRes.statusCode);
              console.log('PUT response:', putData);
            });
          });
          putReq.write(JSON.stringify({ status: 'confirmed' }));
          putReq.end();
        }
      });
    }).end();
  });
});
req.write(JSON.stringify({ email: 'admin@lookimmo.com', password: 'password123' }));
req.end();
