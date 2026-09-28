import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';
import Card from './Card';
import { formatDisplayDate } from '../../utils/dateUtils';

interface DatePickerProps {
  label?: string;
  value: string; // Format: YYYY-MM-DD
  onChange: (dateStr: string) => void;
  icon?: React.ReactNode;
}

export default function DatePicker({ label, value, onChange, icon }: DatePickerProps) {
  const { colors, radius, spacing } = useTheme();
  const [showModal, setShowModal] = useState(false);
  
  // Track the month currently being viewed in the calendar
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  const displayIcon = icon || <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />;

  // Calendar logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Generate grid cells (empty strings for padding before the 1st of the month)
  const calendarGrid = useMemo(() => {
    const grid = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      grid.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(i);
    }
    // Pad end of month to complete the row
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }
    return grid;
  }, [firstDayOfMonth, daysInMonth]);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const selectedDate = new Date(year, month, day);
    const dateString = selectedDate.toLocaleDateString('en-CA'); // Gets YYYY-MM-DD locally
    onChange(dateString);
    setShowModal(false);
  };

  const isSelectedDate = (day: number) => {
    if (!value || !day) return false;
    const selectedDate = new Date(year, month, day);
    return selectedDate.toLocaleDateString('en-CA') === value;
  };

  const isToday = (day: number) => {
    if (!day) return false;
    const checkDate = new Date(year, month, day);
    const today = new Date();
    return checkDate.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
  };

  const openCalendar = () => {
    setViewDate(value ? new Date(value) : new Date());
    setShowModal(true);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Typography variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs, fontWeight: '600' }}>
          {label}
        </Typography>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
          },
        ]}
      >
        <View style={styles.iconContainer}>{displayIcon}</View>

        <TouchableOpacity style={styles.nativeTouchable} onPress={openCalendar}>
          <Text style={{ color: value ? colors.textPrimary : colors.textSecondary, fontSize: 14 }}>
            {value ? formatDisplayDate(value) : 'DD/MM/YYYY'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={[styles.calendarCard, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              
              <Typography variant="body" style={{ fontWeight: '700', fontSize: 16 }}>
                {monthNames[month]} {year}
              </Typography>
              
              <TouchableOpacity onPress={handleNextMonth} style={styles.headerButton}>
                <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Days of Week */}
            <View style={styles.daysRow}>
              {dayNames.map((day, idx) => (
                <View key={idx} style={styles.dayCell}>
                  <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
                    {day}
                  </Typography>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarGrid.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.dateCell} />;
                }
                
                const selected = isSelectedDate(day);
                const today = isToday(day);

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    onPress={() => handleSelectDate(day)}
                    style={[
                      styles.dateCell,
                      selected && { backgroundColor: colors.primary, borderRadius: 20 },
                      !selected && today && { borderWidth: 1, borderColor: colors.primary, borderRadius: 20 }
                    ]}
                  >
                    <Typography
                      color={selected ? colors.white : (today ? colors.primary : colors.textPrimary)}
                      style={{ fontWeight: selected || today ? '700' : '400' }}
                    >
                      {day}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: spacing.sm }}>
                <Typography color={colors.textSecondary} style={{ fontWeight: '600' }}>Cancel</Typography>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  onChange(new Date().toLocaleDateString('en-CA'));
                  setShowModal(false);
                }} 
                style={{ padding: spacing.sm }}
              >
                <Typography color={colors.primary} style={{ fontWeight: '700' }}>Today</Typography>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
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
  nativeTouchable: {
    flex: 1,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 350,
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    padding: 5,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%', // 100% / 7 columns
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 15,
  }
});
