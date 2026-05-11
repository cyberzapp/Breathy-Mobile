const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  content = content.replace(/Logger\.info\(/g, 'console.log(');
  content = content.replace(/Logger\.error\(/g, 'console.error(');
  content = content.replace(/Logger\.warn\(/g, 'console.warn(');
  // Remove imports for Logger
  content = content.replace(/^import\s*\{[^}]*Logger[^}]*\}\s*from\s*['"].*logger['"];?[\r\n]*/gm, (match) => {
    // If there are other imports in the same line, just remove Logger
    if (match.includes(',') && !match.match(/^import\s*\{\s*Logger\s*\}\s*from/)) {
      return match.replace(/\bLogger\b\s*,?\s*/g, '');
    }
    return '';
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

// Also replace in App.tsx and index.ts if present
['./App.tsx', './index.ts'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    content = content.replace(/Logger\.info\(/g, 'console.log(');
    content = content.replace(/Logger\.error\(/g, 'console.error(');
    content = content.replace(/Logger\.warn\(/g, 'console.warn(');
    content = content.replace(/^import\s*\{[^}]*Logger[^}]*\}\s*from\s*['"].*logger['"];?[\r\n]*/gm, '');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedCount++;
    }
  }
});

console.log('Replaced Logger with console in ' + changedCount + ' files.');
