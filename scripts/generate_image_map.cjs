const fs = require('fs');
const path = require('path');

// Configurable paths
const IMAGES_DIR = path.resolve(__dirname, '..', 'public', 'images', 'demo');
const OUT_FILE = path.resolve(__dirname, '..', 'public', 'data', 'demo', 'image-map.json');

function isImage(file) {
  const ext = path.extname(file).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);
}

function formatName(fileBase) {
  // Remove extension, replace underscores or hyphens with spaces, collapse spaces
  let name = fileBase.replace(/\.[^.]+$/, '');
  name = name.replace(/[_-]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Images directory not found:', IMAGES_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR).filter(isImage);
  if (!files.length) {
    console.error('No image files found in', IMAGES_DIR);
    process.exit(1);
  }

  const entries = files.map((f) => {
    const display = formatName(f);
    return { file: f, display };
  });

  // Choices pool = all formatted names
  const allChoices = entries.map(e => e.display);

  const items = entries.map((e, idx) => {
    const id = `im-${String(idx + 1).padStart(3, '0')}-${slugify(e.display)}`;
    return {
      id,
      image: `/images/demo/${e.file.replace(/\\/g, '/')}`,
      choices: allChoices,
      correct: e.display,
      alt: e.display,
    };
  });

  const out = {
    name: 'Imagen - Identificacion',
    items,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Generated ${items.length} image-map items to ${OUT_FILE}`);
}

main();

