const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/**/*.tsx', { cwd: 'e:/Project/breathy-mobile/apps/breathy-patient-mobile' });
let changedFiles = 0;

files.forEach(file => {
  const fullPath = 'e:/Project/breathy-mobile/apps/breathy-patient-mobile/' + file;
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  content = content.replace(/const\s+\{\s*([^}]+)\s*\}\s*=\s*use(Auth|App|Theme)Store\(\);/g, (match, varsStr, storeType) => {
    changed = true;
    const storeName = 'use' + storeType + 'Store';
    const vars = varsStr.split(',').map(v => v.trim()).filter(Boolean);
    return vars.map(v => {
      if (v.includes(':')) {
        const [original, alias] = v.split(':').map(x => x.trim());
        return `const ${alias} = ${storeName}((state) => state.${original});`;
      }
      return `const ${v} = ${storeName}((state) => state.${v});`;
    }).join('\n  ');
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    changedFiles++;
    console.log('Fixed ' + file);
  }
});
console.log('Total fixed:', changedFiles);
