import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();
const distDir = path.resolve('dist');

function addDirToZip(dir, zipFolder) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDirToZip(fullPath, zipFolder.folder(file));
    } else {
      zipFolder.file(file, fs.readFileSync(fullPath));
    }
  }
}

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

addDirToZip(distDir, zip);

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then((buf) => {
  const outputPath = path.resolve('nmx-303-itch-html5.zip');
  fs.writeFileSync(outputPath, buf);
  console.log(`[itch.io packaging] Created ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`);
  console.log('Ready for direct upload to itch.io (index.html sits at the root of the zip archive).');
});
