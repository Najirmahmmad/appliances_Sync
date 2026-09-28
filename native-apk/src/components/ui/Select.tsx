import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, FlatList, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export default function Select({ label, value, options, onChange, icon }: SelectProps) {
  const { colors, radius, spacing } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Typography variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs, fontWeight: '600' }}>
          {label}
        </Typography>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        
        <Typography style={{ flex: 1, color: value ? colors.textPrimary : colors.textSecondary, fontWeight: '500' }} numberOfLines={1}>
          {selectedOption ? selectedOption.label : 'Select...'}
        </Typography>
        
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[
            styles.dropdownContainer, 
            { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              maxHeight: '80%',
            }
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
               <Typography variant="body" style={{ fontWeight: '700' }}>{label || 'Select Option'}</Typography>
               <TouchableOpacity onPress={() => setIsOpen(false)} style={{ padding: 4 }}>
                 <Ionicons name="close" size={20} color={colors.textSecondary} />
               </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              contentContainerStyle={{ paddingBottom: spacing.sm }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border },
                    value === item.value && { backgroundColor: colors.background }
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Typography 
                    style={{ 
                      fontWeight: value === item.value ? '700' : '500',
                      color: value === item.value ? colors.primary : colors.textPrimary 
                    }}
                  >
                    {item.label}
                  </Typography>
                  {value === item.value && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
  },
  iconContainer: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  }
});
