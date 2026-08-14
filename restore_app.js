const fs = require('fs');
const sm = JSON.parse(fs.readFileSync('sm.json', 'utf-8'));
const appSource = sm.sourcesContent[0];
fs.writeFileSync('src/App.tsx', appSource);
console.log('App.tsx successfully restored from sourcemap!');
