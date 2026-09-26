import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';
import ScreenContainer from './ScreenContainer';

interface ItemDropdownProps {
  items: any[];
  onSelect: (item: any) => void;
  label?: string;
  placeholder?: string;
}

export default function ItemDropdown({ items, onSelect, label = 'Select Item', placeholder = 'Search and select an item...' }: ItemDropdownProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => 
    item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.item_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: any) => {
    onSelect(item);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Typography variant="body" style={{ fontWeight: '600', color: colors.textPrimary }}>
          {label}
        </Typography>
      ) : null}

      <TouchableOpacity
        style={[
          styles.selector,
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md
          }
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Typography variant="body" color={colors.textSecondary}>{placeholder}</Typography>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={Platform.OS !== 'web'}
        onRequestClose={() => setModalVisible(false)}
      >
        <ScreenContainer safeArea={true} style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? colors.background : 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' }]}>
              
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Typography variant="sectionTitle">Select Item</Typography>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: spacing.xs }}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: spacing.md }}>
                <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
                  <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search by name or code..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={true}
                  />
                </View>
              </View>

              <FlatList
                data={filteredItems}
                keyExtractor={(item, index) => item.item_code || String(index)}
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Typography variant="body" style={{ fontWeight: '600' }}>{item.item_name}</Typography>
                      <Typography variant="caption" color={colors.textSecondary}>
                        Code: {item.item_code} | HSN: {item.hsn_code || 'N/A'}
                      </Typography>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Typography variant="body" style={{ fontWeight: '700', color: colors.primary }}>
                        ₹{parseFloat(item.rate || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color={colors.textSecondary}>
                        Tax: {item.tax_rate}%
                      </Typography>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <Typography color={colors.textSecondary}>No items found matching "{searchQuery}"</Typography>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </ScreenContainer>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalContent: {
    flex: 1,
    marginTop: Platform.OS === 'web' ? 0 : 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  }
});
