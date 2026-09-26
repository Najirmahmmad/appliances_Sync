const fs = require('fs');
const path = require('path');

const reportDir = path.join(__dirname, 'app', 'report');
const reminderDir = path.join(__dirname, 'app', 'reminder');
const filesToProcess = [
  ...fs.readdirSync(reportDir).map(f => path.join(reportDir, f)),
  ...fs.readdirSync(reminderDir).map(f => path.join(reminderDir, f))
].filter(f => f.endsWith('.tsx'));

for (const file of filesToProcess) {
  let content = fs.readFileSync(file, 'utf-8');

  // Replace imports
  content = content.replace(
    /import { View, Text, StyleSheet, SafeAreaView } from 'react-native';/,
    `import { View, StyleSheet } from 'react-native';\nimport ScreenContainer from '../../src/components/ui/ScreenContainer';\nimport Typography from '../../src/components/ui/Typography';\nimport Card from '../../src/components/ui/Card';\nimport { useTheme } from '../../src/theme/ThemeContext';`
  );
  
  content = content.replace(
    /import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';/,
    `import { View, StyleSheet } from 'react-native';\nimport ScreenContainer from '../../src/components/ui/ScreenContainer';\nimport Typography from '../../src/components/ui/Typography';\nimport Card from '../../src/components/ui/Card';\nimport { useTheme } from '../../src/theme/ThemeContext';`
  );

  // Inject useTheme hook
  content = content.replace(
    /(export default function [A-Za-z0-9_]+Screen\(\) {\n)/,
    `$1  const { colors, spacing } = useTheme();\n`
  );

  // Replace SafeAreaView with ScreenContainer
  content = content.replace(/<SafeAreaView style=\{styles\.safeArea\}>/g, '<ScreenContainer>');
  content = content.replace(/<\/SafeAreaView>/g, '</ScreenContainer>');

  // Replace Text with Typography
  content = content.replace(/<Text/g, '<Typography');
  content = content.replace(/<\/Text>/g, '</Typography>');

  // Apply some dynamic colors in the columns
  content = content.replace(/style=\{styles\.stockText\}/g, `color={colors.success} style={{ fontWeight: '700' }}`);
  content = content.replace(/style=\{styles\.outOfStock\}/g, `color={colors.error} style={{ fontWeight: '700' }}`);
  content = content.replace(/style=\{styles\.errorMsg\}/g, `color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}`);

  // Summary Card replacement
  content = content.replace(
    /<View style=\{styles\.summaryCard\}>\s*<Typography style=\{styles\.summaryLabel\}>(.*?)<\/Typography>\s*<Typography style=\{styles\.summaryVal\}>(.*?)<\/Typography>\s*<\/View>/gs,
    `<Card style={{ margin: spacing.md, backgroundColor: colors.primary, alignItems: 'center', padding: spacing.lg }}>\n        <Typography color={colors.white} variant="secondary">$1</Typography>\n        <Typography color={colors.white} variant="h2" style={{ marginTop: spacing.xs }}>$2</Typography>\n      </Card>`
  );

  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Refactored ${file}`);
}
