import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

// ─────────────────────────────────────────────
// Days of the week for multi-select
// ─────────────────────────────────────────────
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─────────────────────────────────────────────
// Helper: "HH:MM:SS" or "HH:MM" → Date object (today's date, that time)
// ─────────────────────────────────────────────
const timeStringToDate = (timeString) => {
  const now = new Date();
  if (!timeString) {
    now.setHours(8, 0, 0, 0);
    return now;
  }
  const parts = timeString.split(':');
  now.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  return now;
};

// ─────────────────────────────────────────────
// Helper: Date → "HH:MM" (24h) for API storage
// ─────────────────────────────────────────────
const dateToTimeString = (date) => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

// ─────────────────────────────────────────────
// Helper: Date → "h:MM AM/PM" for display
// ─────────────────────────────────────────────
const formatDisplay = (date) => {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

// ─────────────────────────────────────────────
// Helper: "HH:MM:SS" → "h:MM AM/PM" for display
// ─────────────────────────────────────────────
const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function ClassDetailScreen({ route, navigation }) {
  const { classData } = route.params;
  const [classInfo, setClassInfo] = useState(classData);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActive, setIsActive] = useState(Boolean(Number(classData.is_active)));
  const [updating, setUpdating] = useState(false);

  // ── Edit modal state ──
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    class_name: '',
    class_code: '',
    section: '',
    room: '',
    description: '',
    selectedDays: [],
    startTime: new Date(),  // Date objects for the picker
    endTime: new Date(),
  });

  // ── Time picker state ──
  // which picker is open: null | 'start' | 'end'
  const [pickerMode, setPickerMode] = useState(null);
  // Android shows picker as a dialog; iOS shows inline — we handle both
  const [tempTime, setTempTime] = useState(new Date());

  const skipNextFocus = useRef(false);

  // ─────────────────────────────────────────────
  useEffect(() => {
    fetchClassDetails();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (skipNextFocus.current) {
        skipNextFocus.current = false;
        return;
      }
      fetchClassDetails();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchClassDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.get(
        `/enrollments/get_students.php?class_id=${classInfo.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setStudents(response.data.students || []);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassDetails();
  };

  const handleToggleActive = async (value) => {
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await api.put('/classes/index.php', {
        id: classInfo.id,
        is_active: value,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsActive(value);
      setClassInfo({ ...classInfo, is_active: value });
    } catch (error) {
      console.error('Toggle active error:', error);
      Alert.alert('Error', 'Failed to update class status');
      setIsActive(!value);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStudent = (student) => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${student.first_name} ${student.last_name} from this class?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await api.post(
                '/enrollments/delete_enrollment.php',
                { student_id: student.id, class_id: classInfo.id },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (response.data.success) {
                skipNextFocus.current = true;
                setStudents((prev) => prev.filter((s) => s.id !== student.id));
                Alert.alert(
                  'Removed',
                  `${student.first_name} ${student.last_name} has been removed from this class.`
                );
              } else {
                Alert.alert('Error', response.data.message || 'Failed to remove student.');
              }
            } catch (error) {
              console.error('Delete student error:', error.response?.data || error.message);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Open edit modal pre-filled ──
  const openEditModal = () => {
    const storedDays = classInfo.days
      ? classInfo.days.split(',').map((d) => d.trim()).filter(Boolean)
      : [];

    setEditForm({
      class_name: classInfo.class_name || '',
      class_code: classInfo.class_code || '',
      section: classInfo.section || '',
      room: classInfo.room || '',
      description: classInfo.description || '',
      selectedDays: storedDays,
      startTime: timeStringToDate(classInfo.start_time),
      endTime: timeStringToDate(classInfo.end_time),
    });
    setEditVisible(true);
  };

  // ── Toggle a day chip ──
  const toggleDay = (day) => {
    setEditForm((prev) => {
      const exists = prev.selectedDays.includes(day);
      return {
        ...prev,
        selectedDays: exists
          ? prev.selectedDays.filter((d) => d !== day)
          : [...prev.selectedDays, day],
      };
    });
  };

  // ── Open time picker ──
  const openPicker = (mode) => {
    const current = mode === 'start' ? editForm.startTime : editForm.endTime;
    setTempTime(new Date(current));
    setPickerMode(mode);
  };

  // ── Handle picker change ──
  // On Android: fires once with final value (or null if cancelled)
  // On iOS: fires on every scroll
  const onPickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setPickerMode(null); // close picker
      if (event.type === 'dismissed' || !selectedDate) return;
      applyTime(selectedDate);
    } else {
      // iOS — just update temp while spinning
      if (selectedDate) setTempTime(selectedDate);
    }
  };

  // ── Apply chosen time ──
  const applyTime = (date) => {
    if (pickerMode === 'start') {
      setEditForm((p) => ({ ...p, startTime: date }));
    } else {
      setEditForm((p) => ({ ...p, endTime: date }));
    }
  };

  // ── iOS confirm button ──
  const confirmIOSPicker = () => {
    applyTime(tempTime);
    setPickerMode(null);
  };

  // ── Save edited class ──
  const handleSaveEdit = async () => {
    const { class_name, class_code, startTime, endTime, selectedDays } = editForm;

    if (!class_name.trim()) {
      Alert.alert('Validation', 'Class name is required.');
      return;
    }
    if (!class_code.trim()) {
      Alert.alert('Validation', 'Class code is required.');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Validation', 'End time must be after start time.');
      return;
    }

    const sortedDays = ALL_DAYS.filter((d) => selectedDays.includes(d));
    const daysString = sortedDays.join(', ');

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
        id: classInfo.id,
        class_name: editForm.class_name.trim(),
        class_code: editForm.class_code.trim(),
        section: editForm.section.trim(),
        room: editForm.room.trim(),
        description: editForm.description.trim(),
        start_time: dateToTimeString(startTime),
        end_time: dateToTimeString(endTime),
        days: daysString,
      };

      const response = await api.put('/classes/index.php', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setClassInfo({ ...classInfo, ...payload });
        setEditVisible(false);
        Alert.alert('Success', 'Class updated successfully!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update class.');
      }
    } catch (error) {
      console.error('Edit class error:', error.response?.data || error.message);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const scheduleDisplay =
    classInfo.days && classInfo.start_time && classInfo.end_time
      ? `${classInfo.days} • ${formatTime(classInfo.start_time)} - ${formatTime(classInfo.end_time)}`
      : 'No schedule set';

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{classInfo.class_name}</Text>
            <Text style={styles.headerSubtitle}>{classInfo.class_code}</Text>
          </View>
          {/* ✅ SINGLE Edit button — header only */}
          <TouchableOpacity onPress={openEditModal} style={styles.editHeaderButton}>
            <Ionicons name="create-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* ── Class Info Card ── */}
        <View style={styles.infoCard}>
          {/* ✅ Removed duplicate "Edit Class" inline button */}
          <Text style={styles.sectionLabel}>{classInfo.section}</Text>

          {classInfo.description ? (
            <Text style={styles.descriptionText}>{classInfo.description}</Text>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{scheduleDisplay}</Text>
          </View>
          {classInfo.room ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{classInfo.room}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Enrolled Students: {students.length}</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('EnrollStudent', { classData: classInfo })}
          >
            <Ionicons name="person-add" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Enroll Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: COLORS.success || '#16a34a', marginTop: 10 },
              !isActive && { opacity: 0.6 },
            ]}
            onPress={() => {
              if (!isActive) {
                Alert.alert('Class Inactive', 'Activate this class first before taking attendance.');
                return;
              }
              navigation.navigate('ManualAttendance', { classData: classInfo });
            }}
            disabled={!isActive}
          >
            <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Take Attendance</Text>
          </TouchableOpacity>

          {!isActive && (
            <View style={styles.disabledNotice}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
              <Text style={styles.disabledNoticeText}>
                Class not active. Enable class to scan/generate QR codes
              </Text>
            </View>
          )}
        </View>

        {/* ── Enrolled Students List ── */}
        <View style={styles.studentsSection}>
          <Text style={styles.sectionTitle}>Enrolled Students ({students.length})</Text>
          <Text style={styles.hintText}>
            <Ionicons name="hand-left-outline" size={12} color={COLORS.gray} /> Long press a student to remove
          </Text>

          {students.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyStateText}>No students enrolled yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Click "Enroll Student" to add students to this class
              </Text>
            </View>
          ) : (
            students.map((student) => (
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                onLongPress={() => handleDeleteStudent(student)}
                delayLongPress={500}
                activeOpacity={0.85}
              >
                <View style={styles.studentAvatar}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={styles.studentId}>ID: {student.student_id}</Text>
                </View>
                <TouchableOpacity
                  style={styles.studentAction}
                  onPress={() =>
                    navigation.navigate('StudentDetail', {
                      studentData: student,
                      classData: classInfo,
                    })
                  }
                >
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════
          EDIT CLASS MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !saving && setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Class</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} disabled={saving}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>

              {/* Class Name */}
              <Text style={styles.fieldLabel}>
                Class Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={editForm.class_name}
                onChangeText={(v) => setEditForm((p) => ({ ...p, class_name: v }))}
                placeholder="e.g. Mathematics"
                placeholderTextColor={COLORS.gray}
              />

              {/* Class Code */}
              <Text style={styles.fieldLabel}>
                Class Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={editForm.class_code}
                onChangeText={(v) => setEditForm((p) => ({ ...p, class_code: v }))}
                placeholder="e.g. MATH101"
                placeholderTextColor={COLORS.gray}
                autoCapitalize="characters"
              />

              {/* Section */}
              <Text style={styles.fieldLabel}>Section</Text>
              <TextInput
                style={styles.input}
                value={editForm.section}
                onChangeText={(v) => setEditForm((p) => ({ ...p, section: v }))}
                placeholder="e.g. Grade 11 - B"
                placeholderTextColor={COLORS.gray}
              />

              {/* Room */}
              <Text style={styles.fieldLabel}>Room</Text>
              <TextInput
                style={styles.input}
                value={editForm.room}
                onChangeText={(v) => setEditForm((p) => ({ ...p, room: v }))}
                placeholder="e.g. Room 101"
                placeholderTextColor={COLORS.gray}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.description}
                onChangeText={(v) => setEditForm((p) => ({ ...p, description: v }))}
                placeholder="Optional description..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={3}
              />

              {/* Days of Week */}
              <Text style={styles.fieldLabel}>Schedule Days</Text>
              <View style={styles.daysContainer}>
                {ALL_DAYS.map((day) => {
                  const selected = editForm.selectedDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, selected && styles.dayChipSelected]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Time Pickers ── */}
              <Text style={styles.fieldLabel}>Class Time</Text>
              <View style={styles.timeRow}>
                {/* Start Time */}
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => openPicker('start')}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                  <View style={styles.timePickerTextWrapper}>
                    <Text style={styles.timePickerLabel}>Start</Text>
                    <Text style={styles.timePickerValue}>
                      {formatDisplay(editForm.startTime)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                </TouchableOpacity>

                <View style={styles.timeSeparator}>
                  <Text style={styles.timeSeparatorText}>–</Text>
                </View>

                {/* End Time */}
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => openPicker('end')}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                  <View style={styles.timePickerTextWrapper}>
                    <Text style={styles.timePickerLabel}>End</Text>
                    <Text style={styles.timePickerValue}>
                      {formatDisplay(editForm.endTime)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              {/* Android: picker renders as native dialog, no extra UI needed */}
              {/* iOS: picker renders inline inside a modal */}
              {pickerMode !== null && Platform.OS === 'android' && (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour={false}
                  display="clock"
                  onChange={onPickerChange}
                />
              )}

            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════
          iOS TIME PICKER MODAL (inline spinner)
      ══════════════════════════════════════════ */}
      {pickerMode !== null && Platform.OS === 'ios' && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setPickerMode(null)}
        >
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setPickerMode(null)}>
                  <Text style={styles.iosPickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>
                  {pickerMode === 'start' ? 'Start Time' : 'End Time'}
                </Text>
                <TouchableOpacity onPress={confirmIOSPicker}>
                  <Text style={styles.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={onPickerChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  editHeaderButton: { padding: 8 },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 14, color: COLORS.white, opacity: 0.9, marginTop: 4 },

  content: { flex: 1, padding: 16 },

  infoCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    marginBottom: 16, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  sectionLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12 },
  descriptionText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 14, color: COLORS.textPrimary, marginLeft: 12 },

  actionSection: { marginBottom: 24 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16,
    marginBottom: 12, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  disabledNotice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6',
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginTop: 8,
  },
  disabledNoticeText: { fontSize: 12, color: COLORS.warning, marginLeft: 8, flex: 1 },

  studentsSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  hintText: { fontSize: 12, color: COLORS.gray, marginBottom: 16 },
  emptyState: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 60,
    backgroundColor: COLORS.white, borderRadius: 12,
  },
  emptyStateText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '600' },
  emptyStateSubtext: {
    fontSize: 14, color: COLORS.gray, marginTop: 8,
    textAlign: 'center', paddingHorizontal: 32,
  },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 1,
  },
  studentAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.grayLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  studentId: { fontSize: 13, color: COLORS.textSecondary },
  studentAction: { padding: 8 },

  // ── Edit Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  modalScroll: { flexGrow: 0 },

  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.textPrimary,
    marginBottom: 6, marginTop: 10,
  },
  required: { color: COLORS.error },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.textPrimary, backgroundColor: COLORS.background,
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  dayChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dayChipTextSelected: { color: COLORS.white },

  // ── Time picker buttons ──
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timePickerButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  timePickerTextWrapper: { flex: 1, marginLeft: 8 },
  timePickerLabel: { fontSize: 11, color: COLORS.gray, fontWeight: '500' },
  timePickerValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  timeSeparator: { paddingHorizontal: 10 },
  timeSeparatorText: { fontSize: 20, color: COLORS.textSecondary, fontWeight: 'bold' },

  modalFooter: { flexDirection: 'row', marginTop: 16, gap: 10 },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveButton: {
    flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveButtonText: { fontSize: 15, fontWeight: 'bold', color: COLORS.white },

  // ── iOS Picker Modal ──
  iosPickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  iosPickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: COLORS.border,
  },
  iosPickerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  iosPickerCancel: { fontSize: 16, color: COLORS.textSecondary },
  iosPickerDone: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  iosPicker: { height: 200 },
});