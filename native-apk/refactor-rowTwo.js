const fs = require('fs');
const path = require('path');

const transactionDir = path.join(__dirname, 'app', 'transaction');
const files = [
  'stock-transfer.tsx',
  'stock-transfer-return.tsx',
  'sale.tsx',
  'sale-return.tsx',
  'sale-amc.tsx',
  'purchase.tsx',
  'purchase-return.tsx'
];

for (const f of files) {
  const filePath = path.join(transactionDir, f);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Inject useResponsive import
  if (!content.includes('useResponsive')) {
    content = content.replace(
      /import \{ useTheme \} from '\.\.\/\.\.\/src\/theme\/ThemeContext';/,
      `import { useTheme } from '../../src/theme/ThemeContext';\nimport { useResponsive } from '../../src/hooks/useResponsive';`
    );
  }

  // Inject useResponsive hook
  if (!content.includes('const { isMobile } = useResponsive();')) {
    content = content.replace(
      /const \{ colors, spacing, radius \} = useTheme\(\);/,
      `const { colors, spacing, radius } = useTheme();\n  const { isMobile } = useResponsive();`
    );
  }

  // Replace rowTwo usage
  content = content.replace(/<View style=\{styles\.rowTwo\}>/g, `<View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing.md }}>`);

  // Remove rowTwo style
  content = content.replace(/rowTwo: \{ flexDirection: 'row', gap: 10 \},?/g, '');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Processed', f);
}
