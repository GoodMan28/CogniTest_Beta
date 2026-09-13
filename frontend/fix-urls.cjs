const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace axios.get('http://localhost:5000/api...') with axios.get('/api...')
  content = content.replace(/axios\.(get|post|put|delete)\('http:\/\/localhost:5000(\/api[^']+)'/g, "axios.$1('$2'");
  content = content.replace(/axios\.(get|post|put|delete)\(`http:\/\/localhost:5000(\/api[^`]+)`/g, 'axios.$1(`$2`');

  // Replace image paths: `http://localhost:5000${...}` with `${import.meta.env.VITE_API_URL || ''}${...}`
  content = content.replace(/`http:\/\/localhost:5000\$\{([^}]+)\}`/g, '`${import.meta.env.VITE_API_URL || \'\'}${$1}`');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
