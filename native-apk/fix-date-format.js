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

for (const f of formFiles) {
  const filePath = path.join(transactionDir, f);
  if (!fs.existsSync(filePath)) { console.log('SKIP', f); continue; }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix 1: When loading from API, already slicing to 10 chars is good.
  // But when SAVING the payload, vouch_date may still be a full ISO string
  // from a Date object or stored state. We sanitize it in the payload builder.

  // Replace `header: { ...headerData, ` with a sanitized version
  content = content.replace(
    /const payload = \{\s*header: \{\s*\.\.\.headerData,/g,
    `const sanitizedDate = headerData.vouch_date ? String(headerData.vouch_date).slice(0, 10) : new Date().toISOString().slice(0, 10);\n      const payload = {\n        header: {\n          ...headerData,\n          vouch_date: sanitizedDate,`
  );

  // Fix 2: Also ensure that when we SET vouch_date from the API response we always slice
  // This pattern already exists in most files but let's normalize
  content = content.replace(
    /vouch_date: header\.vouch_date \? String\(header\.vouch_date\)\.slice\(0, 10\) : new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/g,
    `vouch_date: header.vouch_date ? String(header.vouch_date).slice(0, 10) : new Date().toISOString().slice(0, 10)`
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${f}`);
}
console.log('Done!');
