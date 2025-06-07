const fs = require('fs-extra');
const path = require('path');

const type = process.argv[2]; // 'chrome' or 'firefox'
if (!type || (type !== 'chrome' && type !== 'firefox')) {
  console.error('Please specify manifest type: "chrome" or "firefox"');
  console.log('Usage: node scripts/copy-manifest.js <chrome|firefox>');
  process.exit(1);
}

const srcManifestPath = path.join(__dirname, '..', 'src', `manifest.${type}.json`);
const destManifestPath = path.join(__dirname, '..', 'src', 'manifest.json');

try {
  if (!fs.existsSync(srcManifestPath)) {
    console.error(`Error: Source manifest file not found: ${srcManifestPath}`);
    process.exit(1);
  }
  fs.copySync(srcManifestPath, destManifestPath, { overwrite: true });
  console.log(`Successfully copied ${srcManifestPath} to ${destManifestPath}`);
} catch (err) {
  console.error(`Error copying manifest file: ${err}`);
  process.exit(1);
}
