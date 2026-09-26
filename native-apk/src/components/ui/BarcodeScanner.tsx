import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';
import Button from './Button';

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { colors, spacing, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' }]}>
        <Typography>Requesting camera permission...</Typography>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' }]}>
        <Typography align="center" style={{ marginBottom: spacing.md }}>
          We need your permission to show the camera
        </Typography>
        <Button title="Grant Permission" onPress={requestPermission} />
        <Button title="Cancel" variant="secondary" onPress={onClose} style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scanned) {
      setScanned(true);
      onScan(data);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
           <Typography color="#fff" align="center" style={{ padding: spacing.lg }}>
             Camera scanning on web using expo-camera is currently limited or requires secure context (HTTPS). 
             If this does not render, please use a mobile device.
           </Typography>
           <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
        </View>
      ) : (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
      )}
      
      <View style={styles.overlay}>
        <View style={[styles.scanBox, { borderColor: colors.primary, borderRadius: radius.md }]} />
      </View>

      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={onClose}
      >
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
