import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import Header from '../../src/components/ui/Header';

export default function AdminTracking() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Tracking" subtitle="Live tracking dashboard" showBack />
      <View style={styles.container}>
        <Text style={styles.text}>Location Tracking Module</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  text: { fontSize: 16, color: '#64748b', fontWeight: '600' },
});
