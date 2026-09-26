import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/config/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Header from '../../src/components/ui/Header';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import Typography from '../../src/components/ui/Typography';

export default function CompanyMasterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing } = useTheme();
  const { isDesktop } = useResponsive();

  // Role validation
  useEffect(() => {
    if (user && !['admin', 'Admin'].some(role => role.toLowerCase() === user.role.toLowerCase())) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.replace('/dashboard');
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<'company' | 'bank' | 'owner' | 'terms'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    company_name: '',
    address: '',
    phone_number: '',
    phone_number2: '',
    email_address: '',
    gst_number: '',
    pan_number: '',
    bank_name: '',
    ifsc_code: '',
    account_number: '',
    branch_name: '',
    terms_condition1: '',
    terms_condition2: '',
    terms_condition3: '',
    terms_condition4: '',
    terms_condition5: '',
    terms_condition6: '',
    terms_condition7: '',
    terms_condition8: '',
    owner_name: '',
    owner_phone: '',
    owner_email: ''
  });

  const fetchCompanyProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company-profile');
      if (response.data.data) {
        setFormData(response.data.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to fetch company profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.company_name) {
      Alert.alert('Validation Error', 'Company Name is required.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('/company-profile', formData);
      Alert.alert('Success', response.data.message || 'Company profile saved successfully!');
      fetchCompanyProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Company Info', icon: 'business' },
    { id: 'bank', label: 'Bank Details', icon: 'card' },
    { id: 'owner', label: 'Owner Details', icon: 'person' },
    { id: 'terms', label: 'Terms & Conditions', icon: 'document-text' }
  ];

  if (loading) {
    return (
      <ScreenContainer>
        <Header title="Company Master" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Company Master" subtitle="Configure company profile and invoice settings" />
      
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row' }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderBottomWidth: 2,
                      borderBottomColor: isActive ? colors.primary : 'transparent',
                      backgroundColor: isActive ? `${colors.primary}10` : 'transparent',
                    }}
                  >
                    <Ionicons 
                      name={tab.icon as any} 
                      size={18} 
                      color={isActive ? colors.primary : colors.textSecondary} 
                      style={{ marginRight: spacing.sm }} 
                    />
                    <Typography 
                      variant="body" 
                      color={isActive ? colors.primary : colors.textSecondary}
                      style={{ fontWeight: isActive ? '600' : '500' }}
                    >
                      {tab.label}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ padding: spacing.lg }}>
            {activeTab === 'company' && (
              <View style={{ gap: spacing.md }}>
                <Input
                  label="Company Name *"
                  value={formData.company_name}
                  onChangeText={(val) => handleInputChange('company_name', val)}
                  placeholder="Enter company name"
                  icon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
                />
                <Input
                  label="Address"
                  value={formData.address}
                  onChangeText={(val) => handleInputChange('address', val)}
                  placeholder="Enter company address"
                  multiline
                  numberOfLines={3}
                />
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md }}>
                  <Input
                    label="Phone Number"
                    value={formData.phone_number}
                    onChangeText={(val) => handleInputChange('phone_number', val.replace(/\D/g, '').slice(0, 15))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Alternative Phone"
                    value={formData.phone_number2}
                    onChangeText={(val) => handleInputChange('phone_number2', val.replace(/\D/g, '').slice(0, 15))}
                    placeholder="Enter alternative phone"
                    keyboardType="phone-pad"
                    icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                </View>
                <Input
                  label="Email Address"
                  value={formData.email_address}
                  onChangeText={(val) => handleInputChange('email_address', val)}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  icon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                />
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md }}>
                  <Input
                    label="GST Number"
                    value={formData.gst_number}
                    onChangeText={(val) => handleInputChange('gst_number', val)}
                    placeholder="Enter GST number"
                    icon={<Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />}
                    autoCapitalize="characters"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="PAN Number"
                    value={formData.pan_number}
                    onChangeText={(val) => handleInputChange('pan_number', val)}
                    placeholder="Enter PAN number"
                    icon={<Ionicons name="finger-print-outline" size={20} color={colors.textSecondary} />}
                    autoCapitalize="characters"
                    containerStyle={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {activeTab === 'bank' && (
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md }}>
                  <Input
                    label="Bank Name"
                    value={formData.bank_name}
                    onChangeText={(val) => handleInputChange('bank_name', val)}
                    placeholder="Enter bank name"
                    icon={<Ionicons name="card-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Account Number"
                    value={formData.account_number}
                    onChangeText={(val) => handleInputChange('account_number', val)}
                    placeholder="Enter account number"
                    keyboardType="number-pad"
                    icon={<Ionicons name="keypad-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                </View>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md }}>
                  <Input
                    label="IFSC Code"
                    value={formData.ifsc_code}
                    onChangeText={(val) => handleInputChange('ifsc_code', val)}
                    placeholder="Enter IFSC code"
                    icon={<Ionicons name="code-outline" size={20} color={colors.textSecondary} />}
                    autoCapitalize="characters"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Branch Name"
                    value={formData.branch_name}
                    onChangeText={(val) => handleInputChange('branch_name', val)}
                    placeholder="Enter branch name"
                    icon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {activeTab === 'owner' && (
              <View style={{ gap: spacing.md }}>
                <Input
                  label="Owner Name"
                  value={formData.owner_name}
                  onChangeText={(val) => handleInputChange('owner_name', val)}
                  placeholder="Enter owner name"
                  icon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                />
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md }}>
                  <Input
                    label="Owner Phone"
                    value={formData.owner_phone}
                    onChangeText={(val) => handleInputChange('owner_phone', val.replace(/\D/g, '').slice(0, 15))}
                    placeholder="Enter owner phone"
                    keyboardType="phone-pad"
                    icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Owner Email"
                    value={formData.owner_email}
                    onChangeText={(val) => handleInputChange('owner_email', val)}
                    placeholder="Enter owner email"
                    keyboardType="email-address"
                    icon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                    containerStyle={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {activeTab === 'terms' && (
              <View style={{ gap: spacing.md }}>
                <Typography variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.sm, fontStyle: 'italic' }}>
                  These terms appear at the bottom of the invoice
                </Typography>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                  {[...Array(8)].map((_, i) => (
                    <Input
                      key={`term-${i + 1}`}
                      label={`Term ${i + 1}`}
                      value={formData[`terms_condition${i + 1}`]}
                      onChangeText={(val) => handleInputChange(`terms_condition${i + 1}`, val)}
                      placeholder={`Enter term ${i + 1}`}
                      icon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
                      containerStyle={{ width: isDesktop ? '48%' : '100%' }}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing.xl, alignItems: 'flex-end' }}>
              <Button
                title={saving ? "Saving..." : "Save Changes"}
                onPress={handleSave}
                loading={saving}
                icon={<Ionicons name="save-outline" size={20} color={colors.white} />}
                style={{ width: isDesktop ? 200 : '100%' }}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
