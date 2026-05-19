import https from 'https';
import fs from 'fs';

https.get('https://raw.githubusercontent.com/deldersveld/topojson/master/countries/japan/jp-prefectures.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('src/japan.json', data);
    console.log('Saved.', data.length);
  });
});
