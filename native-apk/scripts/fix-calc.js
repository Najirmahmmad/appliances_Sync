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
  
  // Looking for the exact calculation chunk
  const target = /const basicAmt = itemQty \* itemRate;\s*const taxAmt = \(basicAmt \* taxRate\) \/ 100;\s*const netAmt = basicAmt \+ taxAmt;/g;
  
  const replacement = `const netAmt = itemQty * itemRate;
    const taxAmt = (netAmt * taxRate) / (100 + taxRate);
    const basicAmt = netAmt - taxAmt;`;
  
  if (target.test(content)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  } else {
    console.log('Not found in ' + f);
  }
});
