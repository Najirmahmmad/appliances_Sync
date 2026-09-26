const fs = require('fs');

const files = [
  'app/transaction/sale.tsx',
  'app/transaction/sale-amc.tsx',
  'app/transaction/sale-return.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // 1. Add formErrors state
  if (!content.includes('const [formErrors, setFormErrors]')) {
    content = content.replace(
      /const \[error, setError\] = useState\(''\);/,
      `const [error, setError] = useState('');\n  const [formErrors, setFormErrors] = useState({ party_name: '', party_phone: '' });`
    );
  }

  // 2. Update Validation in handleSaveInvoice
  const oldValidation = /if \(!headerData\.party_name\.trim\(\)\) \{\s*Alert\.alert\('Validation Error', 'Party Customer Name is required\.'\);\s*return;\s*\}/;
  const newValidation = `let hasError = false;
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

  if (oldValidation.test(content)) {
    content = content.replace(oldValidation, newValidation);
  }

  // 3. Update Inputs
  // Party Name
  const partyNameInput = /<Input\s+label="Party \/ Customer Name \*"\s+value=\{headerData\.party_name\}\s+onChangeText=\{\(text\) => setHeaderData\(\{ \.\.\.headerData, party_name: text \}\)\}/;
  const newPartyNameInput = `<Input\s+label="Party / Customer Name *"\n            error={formErrors.party_name}\n            value={headerData.party_name}\n            onChangeText={(text) => {\n              setHeaderData({ ...headerData, party_name: text });\n              if (text.trim()) setFormErrors(prev => ({ ...prev, party_name: '' }));\n            }}`;
  
  if (partyNameInput.test(content)) {
    content = content.replace(partyNameInput, newPartyNameInput);
  } else {
    // try to match without exact whitespace
    content = content.replace(
      /<Input[\s\S]*?label="Party \/ Customer Name \*"[\s\S]*?onChangeText=\{\(text\) => setHeaderData\(\{ \.\.\.headerData, party_name: text \}\)\}/,
      `<Input
            label="Party / Customer Name *"
            error={formErrors.party_name}
            value={headerData.party_name}
            onChangeText={(text) => {
              setHeaderData({ ...headerData, party_name: text });
              if (text.trim()) setFormErrors(prev => ({ ...prev, party_name: '' }));
            }}`
    );
  }

  // Phone
  content = content.replace(
    /<Input[\s\S]*?label="Phone"[\s\S]*?onChangeText=\{\(text\) => setHeaderData\(\{ \.\.\.headerData, party_phone: text \}\)\}/,
    `<Input
                label="Phone *"
                error={formErrors.party_phone}
                value={headerData.party_phone}
                onChangeText={(text) => {
                  setHeaderData({ ...headerData, party_phone: text });
                  if (text.trim()) setFormErrors(prev => ({ ...prev, party_phone: '' }));
                }}`
  );

  fs.writeFileSync(f, content);
  console.log('Updated ' + f);
});
