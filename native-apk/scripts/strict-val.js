const fs = require('fs');

const files = [
  'app/transaction/sale.tsx',
  'app/transaction/sale-amc.tsx',
  'app/transaction/sale-return.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Add formErrors state
  if (!content.includes('const [formErrors, setFormErrors]')) {
    content = content.replace(
      /const \[error, setError\] = useState\(''\);/,
      `const [error, setError] = useState('');\n  const [formErrors, setFormErrors] = useState({ party_name: '', party_phone: '' });`
    );
  }

  // Update validation logic
  const vTarget = "if (!headerData.party_name.trim()) {\\n      Alert.alert('Validation Error', 'Party Customer Name is required.');\\n      return;\\n    }";
  
  // Since spacing might differ, let's use a more robust regex
  const valRegex = /if \(!headerData\.party_name\.trim\(\)\) \{\s*Alert\.alert\('Validation Error', 'Party Customer Name is required\.'\);\s*return;\s*\}/;
  const valReplacement = `let hasError = false;
    let errors = { party_name: '', party_phone: '' };
    if (!headerData.party_name.trim()) {
      errors.party_name = 'Customer Name is required';
      hasError = true;
    }
    if (!headerData.party_phone.trim()) {
      errors.party_phone = 'Phone number is required';
      hasError = true;
    }
    setFormErrors(errors);
    if (hasError) return;`;
  content = content.replace(valRegex, valReplacement);

  // Update Name Input
  const nameRegex = /<Input\s*label="Party \/ Customer Name \*"\s*value=\{headerData\.party_name\}\s*onChangeText=\{\(text\) => setHeaderData\(\{ \.\.\.headerData, party_name: text \}\)\}/;
  const nameRep = `<Input
            label="Party / Customer Name *"
            error={formErrors.party_name}
            value={headerData.party_name}
            onChangeText={(text) => {
              setHeaderData({ ...headerData, party_name: text });
              if (text.trim()) setFormErrors(prev => ({ ...prev, party_name: '' }));
            }}`;
  content = content.replace(nameRegex, nameRep);

  // Update Phone Input
  const phoneRegex = /<Input\s*label="Phone"\s*value=\{headerData\.party_phone\}\s*onChangeText=\{\(text\) => setHeaderData\(\{ \.\.\.headerData, party_phone: text \}\)\}/;
  const phoneRep = `<Input
                label="Phone *"
                error={formErrors.party_phone}
                value={headerData.party_phone}
                onChangeText={(text) => {
                  setHeaderData({ ...headerData, party_phone: text });
                  if (text.trim()) setFormErrors(prev => ({ ...prev, party_phone: '' }));
                }}`;
  content = content.replace(phoneRegex, phoneRep);

  fs.writeFileSync(f, content);
  console.log('Fixed ' + f);
});
