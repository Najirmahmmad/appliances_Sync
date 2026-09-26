const fs = require('fs');
const files = [
  'app/report/stock-transfer.tsx',
  'app/report/stock-transfer-return.tsx',
  'app/report/sale-summary.tsx',
  'app/report/sale-register.tsx',
  'app/report/purchase-summary.tsx',
  'app/report/purchase-register.tsx',
  'app/report/commission.tsx',
  'app/report/current-stock.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  if (content.includes('String(item.vouch_date).slice(0, 10)') || content.includes('String(row.vouch_date).slice(0, 10)')) {
    if (!content.includes('formatDisplayDate')) {
      content = "import { formatDisplayDate } from '../../src/utils/dateUtils';\n" + content;
    }
    content = content.replace(/String\(item\.vouch_date\)\.slice\(0, 10\)/g, 'formatDisplayDate(item.vouch_date)');
    content = content.replace(/String\(row\.vouch_date\)\.slice\(0, 10\)/g, 'formatDisplayDate(row.vouch_date)');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
