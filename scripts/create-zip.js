const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const packageJson = require('../package.json');

const version = packageJson.version;
const browserType = process.argv[2]; // 'chrome' or 'firefox'

if (!browserType || !['chrome', 'firefox'].includes(browserType)) {
    console.error('Error: Please specify browser type (chrome or firefox) as an argument.');
    console.error('Usage: node scripts/create-zip.js <chrome|firefox>');
    process.exit(1);
}

const sourceDir = path.join(__dirname, '..', 'dist', browserType);
const outputDir = path.join(__dirname, '..', 'release');
const outputFileName = `Tab-Options-${browserType}-${version}.zip`;
const outputFilePath = path.join(outputDir, outputFileName);

async function createZip() {
    try {
        // Ensure source directory exists
        if (!await fs.pathExists(sourceDir)) {
            console.error(`Error: Source directory ${sourceDir} does not exist. Run build first.`);
            process.exit(1);
        }

        await fs.ensureDir(outputDir);

        const output = fs.createWriteStream(outputFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', function () {
            console.log(`Successfully created ${outputFileName} (${archive.pointer()} total bytes)`);
        });

        output.on('end', function () {
            console.log('Data has been drained');
        });

        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                console.warn('Warning:', err);
            } else {
                throw err;
            }
        });

        archive.on('error', function (err) {
            throw err;
        });

        archive.pipe(output);

        // Add files from the source directory at the root of the archive
        archive.directory(sourceDir, false);

        await archive.finalize();

    } catch (error) {
        console.error('Error creating zip file:', error);
        process.exit(1);
    }
}

createZip();
