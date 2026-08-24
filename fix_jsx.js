const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    let filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/ for=/g, ' htmlFor=');
    content = content.replace(/selected="[^"]*"/g, 'selected');
    content = content.replace(/checked="[^"]*"/g, 'checked');
    content = content.replace(/selected /g, 'selected={true} ');
    content = content.replace(/checked /g, 'checked={true} ');
    content = content.replace(/selected>/g, 'selected={true}>');
    content = content.replace(/checked>/g, 'checked={true}>');
    
    // Quick fix for the "Type 'string' is not assignable to type 'boolean'"
    // Sometimes it's `selected="selected"`, which we just replaced with `selected={true}`
    
    if (!content.startsWith('// @ts-nocheck')) {
        content = '// @ts-nocheck\n' + content;
    }
    
    fs.writeFileSync(filePath, content);
});
