import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';
import Button from './Button';

interface FormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  visible,
  onClose,
  title,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  children,
}) => {
  const { colors, radius, spacing } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}>
            <Typography variant="sectionTitle">{title}</Typography>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView contentContainerStyle={[styles.body, { padding: spacing.xl, gap: spacing.md }]}>
            {children}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md }]}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              disabled={loading}
              style={{ flex: 1 }}
            />
            <Button
              title={submitLabel}
              onPress={onSubmit}
              variant="primary"
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
    minHeight: '40%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {},
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});

export default FormModal;
