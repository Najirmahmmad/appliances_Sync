const fs = require('fs');
const files = [
  'app/transaction/purchase-return.tsx',
  'app/transaction/purchase.tsx',
  'app/transaction/sale-amc.tsx',
  'app/transaction/sale-return.tsx',
  'app/transaction/sale.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const target = /const itemRate = parseFloat\(rate\)\s*\|\|\s*parseFloat\(selectedItem\.sale_rate\)\s*\|\|\s*0;/g;
  const replacement = 'const itemRate = rate.trim() !== "" && !isNaN(parseFloat(rate)) ? parseFloat(rate) : (parseFloat(selectedItem.sale_rate) || 0);';
  
  if (target.test(content)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  } else {
    console.log('Not found in ' + f);
  }
});
