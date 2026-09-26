const fs = require('fs');
const path = require('path');

const files = {
  logoLeft: 'native-apk/src/assets/ogo-left.jpeg',
  logoRight: 'native-apk/src/assets/ogo-right.png',
  qrCode: 'native-apk/src/assets/qrCode.jpeg'
};

let out = 'export const invoiceImages = {\n';
for (const [key, relPath] of Object.entries(files)) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const base64 = fs.readFileSync(fullPath).toString('base64');
    const ext = path.extname(fullPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    out += `  ${key}: 'data:${mime};base64,${base64}',\n`;
  } else {
    console.log('Missing file: ' + fullPath);
  }
}
out += '};\n';
fs.writeFileSync('native-apk/src/utils/invoiceAssets.ts', out);
console.log('Generated native-apk/src/utils/invoiceAssets.ts');
