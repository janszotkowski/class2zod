const fs = require('fs');
const path = require('path');

const distDir = './dist';
const basePath = '/class2zod/';

// Najde a nahradí cesty v index.html
const indexPath = path.join(distDir, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');
content = content.replace(/(src|href)="\/(static\/)/g, `$1="${basePath}$2`);
fs.writeFileSync(indexPath, content, 'utf8');
console.log('Cesty v index.html upraveny.');