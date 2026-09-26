const fs = require('fs');
const path = require('path');

const transactionDir = path.join(__dirname, 'app', 'transaction');
const formFiles = [
  'sale.tsx',
  'sale-return.tsx',
  'sale-amc.tsx',
  'purchase.tsx',
  'purchase-return.tsx',
  'stock-transfer.tsx',
  'stock-transfer-return.tsx',
];

const redirectMap = {
  'sale.tsx': '/transaction/sale-list',
  'sale-return.tsx': '/transaction/sale-return-list',
  'sale-amc.tsx': '/transaction/sale-amc-list',
  'purchase.tsx': '/transaction/purchase-list',
  'purchase-return.tsx': '/transaction/purchase-return-list',
  'stock-transfer.tsx': '/transaction/stock-transfer-list',
  'stock-transfer-return.tsx': '/transaction/stock-transfer-return-list',
};

for (const f of formFiles) {
  const filePath = path.join(transactionDir, f);
  if (!fs.existsSync(filePath)) { console.log('SKIP', f); continue; }

  let content = fs.readFileSync(filePath, 'utf-8');
  const route = redirectMap[f];

  // Replace Alert.alert success patterns that onPress redirect with immediate redirect
  // Pattern 1: Alert.alert('Success', '...', [{ text: 'OK', onPress: () => router.push('...') }]);
  content = content.replace(
    /Alert\.alert\('Success',\s*'([^']+)',\s*\[\s*\{\s*text:\s*'OK',\s*onPress:\s*\(\)\s*=>\s*router\.(?:push|replace)\('[^']+'\)\s*\},?\s*\]\s*\);/g,
    (match, message) => {
      return `Alert.alert('Success', '${message}');\n      router.replace('${route}');`;
    }
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated: ${f}`);
}
console.log('Done!');
