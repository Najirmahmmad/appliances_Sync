const fs = require('fs');

const files = [
  'app/transaction/sale.tsx',
  'app/transaction/sale-amc.tsx',
  'app/transaction/sale-return.tsx',
  'app/transaction/purchase.tsx',
  'app/transaction/purchase-return.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // 1. Remove Technician Name View Block
    const techRegex = /<View style=\{\{ flex: 1 \}\}>\s*<Input\s*label="Technician Name"[\s\S]*?<\/View>/g;
    content = content.replace(techRegex, '');

    // 2. Add technician_name to payload
    const payloadTarget = /net_amount:\s*totals\.net,/;
    const payloadReplacement = "net_amount: totals.net,\n            technician_name: user?.name || user?.username || '',";
    
    if (!content.includes('technician_name: user?.name')) {
      content = content.replace(payloadTarget, payloadReplacement);
    }

    fs.writeFileSync(f, content);
    console.log('Fixed ' + f);
  }
});
