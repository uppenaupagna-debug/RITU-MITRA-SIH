const fs = require('fs');
const path = require('path');

const filePath = '/Users/srimannarayanadeevi/.gemini/antigravity/scratch/RaituMitra/src/data/cropMaster.js';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

const categories = [
  { name: 'cereals', comment: 'GRAINS & CEREALS' },
  { name: 'pulses', comment: 'PULSES' },
  { name: 'oilseeds', comment: 'OILSEEDS' },
  { name: 'vegetables', comment: 'VEGETABLES' },
  { name: 'fruits', comment: 'FRUITS' },
  { name: 'spices', comment: 'SPICES' },
  { name: 'cashCrops', comment: 'CASH CROPS' },
  { name: 'fodder', comment: 'FODDER CROPS' },
  { name: 'flowers', comment: 'FLOWERS' },
  { name: 'medicinal', comment: 'MEDICINAL PLANTS' }
];

let currentCategory = null;
let currentCrops = [];

const outDir = '/Users/srimannarayanadeevi/.gemini/antigravity/scratch/RaituMitra/src/data/crops';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (let line of lines) {
  let foundCat = null;
  for (let cat of categories) {
    if (line.includes('//') && line.includes(cat.comment)) {
      foundCat = cat;
      break;
    }
  }

  if (foundCat) {
    if (currentCategory && currentCrops.length > 0) {
      // Save previous category crops
      fs.writeFileSync(
        path.join(outDir, `${currentCategory.name}.js`),
        `export const ${currentCategory.name} = [\n${currentCrops.join('\n')}\n];\n`,
        'utf8'
      );
    }
    currentCategory = foundCat;
    currentCrops = [];
  } else {
    let trimmed = line.trim();
    if (trimmed.startsWith('{') || trimmed.endsWith('},')) {
      let cleaned = trimmed;
      if (cleaned.endsWith('];')) cleaned = cleaned.slice(0, -2);
      if (cleaned.endsWith(',')) cleaned = cleaned.slice(0, -1);
      currentCrops.push('  ' + cleaned + ',');
    }
  }
}

if (currentCategory && currentCrops.length > 0) {
  fs.writeFileSync(
    path.join(outDir, `${currentCategory.name}.js`),
    `export const ${currentCategory.name} = [\n${currentCrops.join('\n')}\n];\n`,
    'utf8'
  );
}

console.log("Successfully split monolithic crops database into modular category files under src/data/crops/!");
