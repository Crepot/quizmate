const fs = require('fs');
const path = 'e:/quizmate/public/data/demo/freeform.json';
let s = fs.readFileSync(path, 'utf8');
// Split into chunks where a new object likely starts: '}' followed by optional whitespace and '{'
const parts = s.split(/}\s*\n\s*\{/g);
const items = [];
for (let i = 0; i < parts.length; i++) {
  let part = parts[i].trim();
  if (!part) continue;
  // rebuild valid JSON for this part
  if (!part.startsWith('{')) part = '{' + part;
  if (!part.endsWith('}')) part = part + '}';
  try {
    const obj = JSON.parse(part);
    if (Array.isArray(obj.items)) {
      items.push(...obj.items);
    } else {
      console.warn('No items in part', i);
    }
  } catch (e) {
    // Try to be more lenient: attempt to find the first occurrence of [ ... ] and parse that
    const m = part.match(/\[([\s\S]*)\][^]*$/m);
    if (m) {
      try {
        const arr = JSON.parse('[' + m[1] + ']');
        items.push(...arr);
      } catch (err) {
        console.error('Failed to parse items in part', i, err.message);
      }
    } else {
      console.error('Failed to parse JSON part', i, e.message);
    }
  }
}
const out = { items };
fs.writeFileSync(path, JSON.stringify(out, null, 2), 'utf8');
console.log('Merged', items.length, 'items into', path);
