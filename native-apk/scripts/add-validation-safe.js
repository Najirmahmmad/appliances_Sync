const fs = require('fs');

const files = [
  'app/transaction/sale.tsx',
  'app/transaction/sale-amc.tsx',
  'app/transaction/sale-return.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // 1. Fix tax calculation (restoring what I did earlier)
  const calcTarget = /const basicAmt = itemQty \* itemRate;\s*const taxAmt = \(basicAmt \* taxRate\) \/ 100;\s*const netAmt = basicAmt \+ taxAmt;/g;
  const calcReplacement = `const netAmt = itemQty * itemRate;
    const taxAmt = (netAmt * taxRate) / (100 + taxRate);
    const basicAmt = netAmt - taxAmt;`;
  if (calcTarget.test(content)) {
    content = content.replace(calcTarget, calcReplacement);
  }

  // Also rate parsing fix
  const rateTarget = /const itemRate = parseFloat\(rate\) \|\| parseFloat\(selectedItem\.sale_rate\) \|\| 0;/g;
  const rateReplacement = `const itemRate = rate.trim() !== "" && !isNaN(parseFloat(rate)) ? parseFloat(rate) : (parseFloat(selectedItem.sale_rate) || 0);`;
  if (rateTarget.test(content)) {
    content = content.replace(rateTarget, rateReplacement);
  }

  // 2. Add formErrors state
  if (!content.includes('const [formErrors, setFormErrors]')) {
    content = content.replace(
      /const \[error, setError\] = useState\(''\);/,
      `const [error, setError] = useState('');\n  const [formErrors, setFormErrors] = useState({ party_name: '', party_phone: '' });`
    );
  }

  // 3. Validation logic
  const oldValidationStr = `if (!headerData.party_name.trim()) {
      Alert.alert('Validation Error', 'Party Customer Name is required.');
      return;
    }`;
  const newValidationStr = `let hasError = false;
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

  // Depending on spacing, regex is safer for oldValidationStr
  const oldValRegex = /if \(!headerData\.party_name\.trim\(\)\) \{\s*Alert\.alert\('Validation Error', 'Party Customer Name is required\.'\);\s*return;\s*\}/;
  if (oldValRegex.test(content)) {
    content = content.replace(oldValRegex, newValidationStr);
  }

  // 4. Update Inputs
  const oldPartyInput = `<Input
            label="Party / Customer Name *"
            value={headerData.party_name}
            onChangeText={(text) => setHeaderData({ ...headerData, party_name: text })}
            placeholder="e.g. John Doe"
          />`;
  const newPartyInput = `<Input
            label="Party / Customer Name *"
            error={formErrors.party_name}
            value={headerData.party_name}
            onChangeText={(text) => {
              setHeaderData({ ...headerData, party_name: text });
              if (text.trim()) setFormErrors(prev => ({ ...prev, party_name: '' }));
            }}
            placeholder="e.g. John Doe"
          />`;
  content = content.replace(oldPartyInput, newPartyInput);

  const oldPhoneInput = `<Input
                label="Phone"
                value={headerData.party_phone}
                onChangeText={(text) => setHeaderData({ ...headerData, party_phone: text })}
                keyboardType="phone-pad"
                placeholder="10-digit number"
              />`;
  const newPhoneInput = `<Input
                label="Phone *"
                error={formErrors.party_phone}
                value={headerData.party_phone}
                onChangeText={(text) => {
                  setHeaderData({ ...headerData, party_phone: text });
                  if (text.trim()) setFormErrors(prev => ({ ...prev, party_phone: '' }));
                }}
                keyboardType="phone-pad"
                placeholder="10-digit number"
              />`;
  content = content.replace(oldPhoneInput, newPhoneInput);

  fs.writeFileSync(f, content);
  console.log('Processed ' + f);
});
