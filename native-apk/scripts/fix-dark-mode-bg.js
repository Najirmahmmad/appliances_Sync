const fs = require('fs');

const f = 'app/dashboard/index.tsx';
let content = fs.readFileSync(f, 'utf8');

const target = /backgroundColor: '#f8fafc'/g;
const replacement = "backgroundColor: isDark ? colors.background : '#f8fafc'";

if (target.test(content)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(f, content);
  console.log('Fixed ' + f);
} else {
  console.log('Not found');
}
