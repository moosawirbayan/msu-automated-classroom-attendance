import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // ✅ DAGDAG
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

let CameraView, useCameraPermissions;
if (Platform.OS !== 'web') {
  ({ CameraView, useCameraPermissions } = require('expo-camera'));
}

export default function ScannerScreen() {
  const [scanned, setScanned] = useState(false);
  const [paused, setPaused]   = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Ionicons name="phone-portrait-outline" size={64} color={COLORS.primary} />
        <Text style={styles.errorText}>Use Mobile Device</Text>
        <Text style={styles.errorSubtext}>
          QR Code scanning is only available on a physical device.{'\n'}
          Open the app with Expo Go on your phone.
        </Text>
      </View>
    );
  }

  return (
    <NativeScanner
      scanned={scanned}
      setScanned={setScanned}
      paused={paused}
      setPaused={setPaused}
    />
  );
}

/* ── Native-only component ─────────────────────────────── */
function NativeScanner({ scanned, setScanned, paused, setPaused }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [activeClasses, setActiveClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(false); // ✅ loading indicator

  // ✅ FIXED: useFocusEffect — mag-rere-refresh ang classes every time
  // bumabalik sa Scanner screen (e.g. galing sa ibang tab or screen)
  useFocusEffect(
    useCallback(() => {
      const loadClasses = async () => {
        setLoadingClasses(true);
        try {
          const token = await AsyncStorage.getItem('authToken');
          const response = await api.get('/classes/index.php', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.data.success) {
            const classes = (response.data.data || []).filter(
              (cls) => Number(cls.is_active) === 1
            );
            setActiveClasses(classes);

            // ✅ Auto-select:
            // - Kung walang selected pa, piliin ang una
            // - Kung yung selected ay naging inactive na, i-reset
            setSelectedClassId((prevId) => {
              const stillActive = classes.find(
                (cls) => String(cls.id) === String(prevId)
              );
              if (stillActive) return prevId;       // ✅ keep existing selection
              return classes.length > 0 ? classes[0].id : null; // ✅ auto-select first
            });
          }
        } catch (error) {
          console.error('Load active classes error:', error);
        } finally {
          setLoadingClasses(false);
        }
      };

      loadClasses();
    }, []) // ✅ empty dependency — mag-rere-run lang on focus
  );

  const selectedClass = activeClasses.find(
    (cls) => String(cls.id) === String(selectedClassId)
  );

  const chooseClass = () => {
    if (activeClasses.length === 0) {
      Alert.alert('No Active Class', 'Please activate at least one class before scanning.');
      return;
    }

    Alert.alert(
      'Select Class',
      'Choose the active class for this scan session.',
      [
        ...activeClasses.map((cls) => ({
          text: `${cls.class_code} - ${cls.class_name}`,
          onPress: () => setSelectedClassId(cls.id),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Checking camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-off" size={64} color={COLORS.gray} />
        <Text style={styles.errorText}>Camera Permission Required</Text>
        <Text style={styles.errorSubtext}>Grant camera access to scan QR codes.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || paused) return;
    setScanned(true);

    if (!selectedClassId) {
      Alert.alert('Select Class First', 'Choose an active class before scanning.', [
        { text: 'Choose Class', onPress: () => { setScanned(false); chooseClass(); } },
        { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
      ]);
      return;
    }

    let studentDbId = null;
    let studentName = '';

    try {
      if (typeof data === 'string' && data.trim().startsWith('{')) {
        const jsonPayload = JSON.parse(data);
        studentDbId = jsonPayload.studentId || jsonPayload.id || null;
        studentName = (jsonPayload.name || '').trim();
      } else {
        const parts = String(data).split('|');
        if (parts.length < 2) {
          Alert.alert('Invalid QR Code', 'Please scan a valid student attendance QR code.', [
            { text: 'OK', onPress: () => setScanned(false) },
          ]);
          return;
        }
        studentDbId = parts[0];
        const nameParts = parts.slice(2);
        studentName = (nameParts.join(' ') || parts.slice(1).join(' ')).trim();
      }
    } catch (_) {
      Alert.alert('Invalid QR Code', 'Unable to read this QR format.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
      return;
    }

    const cleanStudentDbId = Number(String(studentDbId).trim());
    if (!Number.isInteger(cleanStudentDbId) || cleanStudentDbId <= 0) {
      Alert.alert('Invalid QR Code', 'Student identifier is missing or invalid.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
      return;
    }

    Alert.alert(
      'Confirm Attendance',
      `Mark attendance for:\n\n${studentName}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await api.post('/attendance/mark.php', {
                studentId: cleanStudentDbId,
                classId: selectedClassId,
              });
              if (response.data.success) {
                Alert.alert(
                  '✓ Attendance Marked',
                  `${response.data.student_name} has been marked present.`,
                  [{ text: 'OK', onPress: () => setScanned(false) }]
                );
              } else {
                Alert.alert('Failed', response.data.message || 'Could not mark attendance.', [
                  { text: 'OK', onPress: () => setScanned(false) },
                ]);
              }
            } catch (error) {
              const msg = error.response?.data?.message || 'Failed to mark attendance.';
              Alert.alert('Error', msg, [{ text: 'OK', onPress: () => setScanned(false) }]);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!paused && (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={styles.overlay}>
            {/* Top label */}
            <View style={styles.topBar}>
              <Text style={styles.headerTitle}>Scan QR Code</Text>
              <Text style={styles.headerSubtitle}>Point camera at a student's QR code</Text>
              <TouchableOpacity style={styles.classPickerButton} onPress={chooseClass}>
                <Ionicons name="book-outline" size={16} color="#fff" />
                <Text style={styles.classPickerText}>
                  {loadingClasses
                    ? 'Loading classes…'                          // ✅ loading state
                    : selectedClass
                      ? `${selectedClass.class_code} - ${selectedClass.class_name}`
                      : 'Select Active Class'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Viewfinder corners */}
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            {/* Status */}
            <View style={styles.bottomBar}>
              <Text style={styles.footerText}>
                {scanned ? 'Processing…' : 'Ready to scan'}
              </Text>
            </View>
          </View>
        </CameraView>
      )}

      {paused && (
        <View style={styles.pausedOverlay}>
          <Ionicons name="pause-circle" size={80} color={COLORS.white} />
          <Text style={styles.pausedText}>Scanner Paused</Text>
        </View>
      )}

      {/* Pause / Resume button */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => { setPaused(p => !p); setScanned(false); }}
        >
          <Ionicons name={paused ? 'play' : 'pause'} size={22} color={COLORS.white} />
          <Text style={styles.controlButtonText}>{paused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'space-between', alignItems: 'center' },
  topBar: { paddingTop: 60, alignItems: 'center' },
  classPickerButton: { marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  classPickerText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  scanArea: { width: 260, height: 260, position: 'relative' },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#fff' },
  cornerTL: { top: 0,    left: 0,   borderTopWidth: 4,    borderLeftWidth: 4 },
  cornerTR: { top: 0,    right: 0,  borderTopWidth: 4,    borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0,   borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0,  borderBottomWidth: 4, borderRightWidth: 4 },
  bottomBar: { paddingBottom: 90, alignItems: 'center' },
  footerText: { fontSize: 15, color: '#fff' },
  pausedOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  pausedText: { fontSize: 20, color: '#fff', marginTop: 12 },
  controls: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  controlButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 30, elevation: 4 },
  controlButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 16, textAlign: 'center' },
  errorSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  permissionButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});