/**
 * Icon Generation Script
 *
 * This script generates PNG icons from the SVG source.
 *
 * To generate icons, you have two options:
 *
 * 1. Use an online converter:
 *    - Go to https://convertio.co/svg-png/
 *    - Upload public/icon-192x192.svg
 *    - Convert to 192x192 PNG and 512x512 PNG
 *    - Save as icon-192x192.png and icon-512x512.png in public/
 *
 * 2. Use ImageMagick (if installed):
 *    brew install imagemagick
 *    convert public/icon-192x192.svg -resize 192x192 public/icon-192x192.png
 *    convert public/icon-192x192.svg -resize 512x512 public/icon-512x512.png
 *
 * 3. Use Node with sharp (install sharp first):
 *    npm install sharp --save-dev
 *    Then run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp if available
try {
  const sharp = require('sharp');

  const svgPath = path.join(__dirname, 'public', 'icon-192x192.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate 192x192
  sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, 'public', 'icon-192x192.png'))
    .then(() => console.log('✅ Generated icon-192x192.png'))
    .catch(err => console.error('Error generating 192px icon:', err));

  // Generate 512x512
  sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, 'public', 'icon-512x512.png'))
    .then(() => console.log('✅ Generated icon-512x512.png'))
    .catch(err => console.error('Error generating 512px icon:', err));

  // Generate favicon
  const faviconSvg = fs.readFileSync(path.join(__dirname, 'public', 'favicon.svg'));
  sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, 'public', 'favicon.png'))
    .then(() => console.log('✅ Generated favicon.png'))
    .catch(err => console.error('Error generating favicon:', err));

} catch (error) {
  console.log('⚠️  Sharp not installed. Install it with: npm install sharp --save-dev');
  console.log('   Or use the manual methods described above.');
}
