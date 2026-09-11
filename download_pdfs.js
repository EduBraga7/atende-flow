
const fs = require('fs');
const https = require('https');

async function run() {
  console.log('Fetching URL...');
  const html = await new Promise((resolve, reject) => {
    https.get('https://www.caraguatatuba.sp.gov.br/pmc/secretaria-de-mobilidade-protecao/horario-dos-onibus/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  const links = [];
  const regex = /href="([^"]+\.pdf)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }

  const uniqueLinks = [...new Set(links)];
  console.log('Found ' + uniqueLinks.length + ' PDFs.');

  for (const link of uniqueLinks) {
    console.log('Processing: ' + link);
    const pdfBuffer = await new Promise((resolve, reject) => {
      https.get(link, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          https.get(res.headers.location, (res2) => {
            const chunks = [];
            res2.on('data', chunk => chunks.push(chunk));
            res2.on('end', () => resolve(Buffer.concat(chunks)));
          }).on('error', reject);
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });

    const filename = link.split('/').pop();
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);
    
    try {
      const resp = await fetch('http://localhost:3000/api/documents', {
        method: 'POST',
        body: formData
      });
      const result = await resp.json();
      console.log('Uploaded: ' + filename + ' - Chunks: ' + result.chunksCreated);
    } catch(e) {
      console.error('Failed to upload ' + filename + ':', e.message);
    }
  }
}
run();

