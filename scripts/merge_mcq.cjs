const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'public', 'data', 'demo', 'mcq.json');
let txt = fs.readFileSync(file, 'utf8');
const regex = /"items"\s*:\s*(\[[\s\S]*?\])\s*\}/g;
let match;
let all = [];
while ((match = regex.exec(txt)) !== null) {
  const arrStr = match[1];
  try {
    const arr = JSON.parse(arrStr);
    if (Array.isArray(arr)) all.push(...arr);
  } catch (e) {
    console.error('Failed parsing an items array:', e.message);
    process.exit(2);
  }
}
if (all.length === 0) {
  console.error('No items arrays found in', file);
  process.exit(1);
}
const out = JSON.stringify({ items: all }, null, 2);
fs.writeFileSync(file, out, 'utf8');
console.log(`Merged ${all.length} items into ${file}`);
