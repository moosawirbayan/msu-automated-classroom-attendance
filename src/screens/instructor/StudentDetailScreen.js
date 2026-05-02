import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

/* ─── Sub-components OUTSIDE main component (fixes keyboard closing) ─── */
const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

const EditField = ({ icon, label, field, placeholder, keyboardType = 'default', autoCapitalize = 'words', maxLength, form, setForm }) => (
  <View style={styles.editRow}>
    <View style={[styles.infoIcon, { marginTop: 4 }]}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={form[field]}
        onChangeText={(text) => setForm((prev) => ({ ...prev, [field]: text }))}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  </View>
);

export default function StudentDetailScreen({ route, navigation }) {
  const { studentData: initialData, classData } = route.params;
  const qrViewShotRef = useRef(null);

  const [studentData, setStudentData] = useState(initialData);
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [form, setForm] = useState({
    student_id:     initialData.student_id     || '',
    first_name:     initialData.first_name     || '',
    middle_initial: initialData.middle_initial || '',
    last_name:      initialData.last_name      || '',
    program:        initialData.program        || '',
    email:          initialData.email          || '',
    parent_email:   initialData.parent_email   || '',
    parent_name:    initialData.parent_name    || '',
    phone:          initialData.phone          || '',
  });

  const fullName = [
    studentData.first_name,
    studentData.middle_initial ? studentData.middle_initial + '.' : null,
    studentData.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const presentCount = histLoading
    ? null
    : history.filter(r => r.status === 'present' || r.status === 'late').length;

  const absentCount = histLoading
    ? null
    : history.filter(r => r.status === 'absent').length;

  const totalFromHistory = histLoading ? 0 : (presentCount + absentCount);
  const attendanceRate = !histLoading && totalFromHistory > 0
    ? Math.round((presentCount / totalFromHistory) * 1000) / 10
    : (studentData.attendance_rate ?? 0);

  useEffect(() => {
    if (!classData) return;
    setHistLoading(true);
    AsyncStorage.getItem('authToken').then(token =>
      api.get(`/attendance/student_history.php?student_id=${initialData.id}&class_id=${classData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).then(res => {
      if (res.data.success) {
        const records = res.data.records || [];
        setHistory(records);

        const p     = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const a     = records.filter(r => r.status === 'absent').length;
        const total = p + a;
        const rate  = total > 0 ? Math.round((p / total) * 1000) / 10 : 0;

        setStudentData(prev => ({
          ...prev,
          present_count:   p,
          absent_count:    a,
          attendance_rate: rate,
        }));
      }
    }).catch(err => {
      console.error('History fetch error:', err);
    }).finally(() => setHistLoading(false));
  }, [initialData.id, classData]);

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return COLORS.success;
    if (rate >= 75) return COLORS.warning;
    return COLORS.error;
  };

  const handleEdit = () => {
    setForm({
      student_id:     studentData.student_id     || '',
      first_name:     studentData.first_name     || '',
      middle_initial: studentData.middle_initial || '',
      last_name:      studentData.last_name      || '',
      program:        studentData.program        || '',
      email:          studentData.email          || '',
      parent_email:   studentData.parent_email   || '',
      parent_name:    studentData.parent_name    || '',
      phone:          studentData.phone          || '',
    });
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!form.student_id.trim()) {
      Alert.alert('Validation Error', 'Student ID is required');
      return;
    }
    if (!form.first_name.trim()) {
      Alert.alert('Validation Error', 'First Name is required');
      return;
    }
    if (!form.last_name.trim()) {
      Alert.alert('Validation Error', 'Last Name is required');
      return;
    }
    if (!form.program.trim()) {
      Alert.alert('Validation Error', 'Program is required');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (form.parent_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parent_email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid parent email address');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.put('/enrollments/update_student.php', {
        id:             studentData.id,
        student_id:     form.student_id.trim(),
        first_name:     form.first_name.trim(),
        middle_initial: form.middle_initial.trim(),
        last_name:      form.last_name.trim(),
        program:        form.program.trim(),
        email:          form.email.trim(),
        parent_email:   form.parent_email.trim(),
        parent_name:    form.parent_name.trim(),
        phone:          form.phone.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setStudentData((prev) => ({
          ...prev,
          student_id:     form.student_id.trim(),
          first_name:     form.first_name.trim(),
          middle_initial: form.middle_initial.trim(),
          last_name:      form.last_name.trim(),
          program:        form.program.trim(),
          email:          form.email.trim(),
          parent_email:   form.parent_email.trim(),
          parent_name:    form.parent_name.trim(),
          phone:          form.phone.trim(),
        }));
        setEditing(false);
        Alert.alert('Success', 'Student information updated');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Update student error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const doDownloadQr = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'QR download is only available on mobile devices.');
      return;
    }

    if (!qrViewShotRef.current) {
      Alert.alert('Error', 'QR code is not ready yet. Please try again.');
      return;
    }

    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow media library access to save the QR code.');
        return;
      }

      const uri   = await qrViewShotRef.current.capture();
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('MSU Attendance QR', asset, false).catch(() => null);

      Alert.alert('Saved! ✅', `QR code for ${fullName} has been saved to your gallery.`);
    } catch (error) {
      console.error('Download QR error:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadQr = () => {
    Alert.alert(
      'Download QR Code',
      `Do you want to download the QR code for ${fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', style: 'default', onPress: doDownloadQr },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              if (editing) {
                Alert.alert('Discard Changes?', 'You have unsaved changes.', [
                  { text: 'Keep Editing', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => { setEditing(false); navigation.goBack(); } },
                ]);
              } else {
                navigation.goBack();
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{editing ? 'Edit Student' : 'Student Detail'}</Text>

          {editing ? (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.headerBtn} disabled={saving}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.headerBtn, styles.saveBtn]} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Ionicons name="checkmark" size={22} color={COLORS.white} />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
              <Ionicons name="create-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.studentName}>{fullName}</Text>
          <Text style={styles.studentIdText}>ID: {studentData.student_id}</Text>
          {classData && (
            <View style={styles.classBadge}>
              <Ionicons name="book-outline" size={14} color={COLORS.white} />
              <Text style={styles.classBadgeText}>{classData.class_name}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ── Attendance stats — view mode only ── */}
          {!editing && (
            <>
              <View style={styles.rateCard}>
                <Text style={styles.rateLabel}>Attendance Rate</Text>
                <Text style={[styles.rateValue, { color: getAttendanceColor(attendanceRate) }]}>
                  {histLoading ? '—' : `${attendanceRate}%`}
                </Text>
                <View style={styles.rateBarBg}>
                  <View
                    style={[
                      styles.rateBarFill,
                      {
                        width: `${Math.min(attendanceRate, 100)}%`,
                        backgroundColor: getAttendanceColor(attendanceRate),
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderColor: COLORS.success }]}>
                  <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                  <Text style={[styles.statNum, { color: COLORS.success }]}>
                    {histLoading ? '—' : presentCount}
                  </Text>
                  <Text style={styles.statLbl}>Present</Text>
                </View>
                <View style={[styles.statCard, { borderColor: COLORS.error }]}>
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                  <Text style={[styles.statNum, { color: COLORS.error }]}>
                    {histLoading ? '—' : absentCount}
                  </Text>
                  <Text style={styles.statLbl}>Absent</Text>
                </View>
              </View>
            </>
          )}

          {/* ── Personal Info — View Mode ── */}
          {!editing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <InfoRow icon="id-card-outline"       label="Student ID"       value={studentData.student_id} />
              <InfoRow icon="person-outline"         label="Full Name"        value={fullName} />
              <InfoRow icon="school-outline"         label="Program"          value={studentData.program} />
              <InfoRow icon="mail-outline"           label="Email"            value={studentData.email} />
              <InfoRow icon="person-circle-outline"  label="Parent/Guardian"  value={studentData.parent_name} />
              <InfoRow icon="mail-open-outline"      label="Parent Email"     value={studentData.parent_email} />
              <InfoRow icon="call-outline"           label="Mobile Number"    value={studentData.phone} />
            </View>
          )}

          {/* ── QR Code — View Mode ── */}
          {!editing && classData && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attendance QR Code</Text>
              <Text style={styles.qrHint}>Instructor scans this to mark attendance</Text>

              <ViewShot
                ref={qrViewShotRef}
                options={{ format: 'png', quality: 1 }}
                style={styles.qrShot}
              >
                <View style={styles.qrContainer}>
                  <QRCode
                    value={`${studentData.id}|${studentData.student_id}|${fullName}`}
                    size={200}
                    color={COLORS.textPrimary}
                    backgroundColor={COLORS.white}
                  />
                  <View style={styles.qrNameBadge}>
                    <Text style={styles.qrNameText}>{fullName}</Text>
                    <Text style={styles.qrIdText}>ID: {studentData.student_id}</Text>
                  </View>
                </View>
              </ViewShot>

              <Text style={styles.qrLabel}>{fullName}</Text>
              <Text style={styles.qrSub}>Reusable in all classes for this student</Text>

              <TouchableOpacity
                style={[styles.downloadQrButton, downloading && { opacity: 0.7 }]}
                onPress={handleDownloadQr}
                disabled={downloading}
              >
                {downloading
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Ionicons name="download-outline" size={18} color={COLORS.white} />
                }
                <Text style={styles.downloadQrButtonText}>
                  {downloading ? 'Saving...' : 'Download QR'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Attendance History — View Mode ── */}
          {!editing && classData && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attendance History</Text>
              {histLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
              ) : history.length === 0 ? (
                <View style={styles.histEmpty}>
                  <Ionicons name="calendar-outline" size={36} color={COLORS.gray} />
                  <Text style={styles.histEmptyText}>No attendance records yet</Text>
                </View>
              ) : (
                history.map((rec, idx) => {
                  const statusColors = {
                    present: COLORS.success,
                    absent:  COLORS.error,
                    late:    '#f59e0b',
                    excused: COLORS.info,
                  };
                  const statusIcons = {
                    present: 'checkmark-circle',
                    absent:  'close-circle',
                    late:    'time',
                    excused: 'information-circle',
                  };
                  const color = statusColors[rec.status] || COLORS.gray;
                  const icon  = statusIcons[rec.status]  || 'ellipse';
                  return (
                    <View
                      key={idx}
                      style={[styles.histRow, idx % 2 === 0 ? styles.histEven : styles.histOdd]}
                    >
                      <Ionicons name={icon} size={20} color={color} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.histDate}>{rec.date_formatted}</Text>
                        <Text style={styles.histTime}>{rec.time_in}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color }]}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ── Personal Info — Edit Mode ── */}
          {editing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Edit Information</Text>

              <EditField
                icon="id-card-outline"
                label="Student ID *"
                field="student_id"
                placeholder="e.g. 2025-001"
                autoCapitalize="none"
                form={form}
                setForm={setForm}
              />

              <View style={styles.nameEditRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.infoLabel}>First Name *</Text>
                  <TextInput
                    style={styles.editInput}
                    value={form.first_name}
                    onChangeText={(t) => setForm((p) => ({ ...p, first_name: t }))}
                    placeholder="First"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.infoLabel}>M.I.</Text>
                  <TextInput
                    style={styles.editInput}
                    value={form.middle_initial}
                    onChangeText={(t) => setForm((p) => ({ ...p, middle_initial: t }))}
                    placeholder="D."
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="characters"
                    maxLength={3}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.infoLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.editInput}
                    value={form.last_name}
                    onChangeText={(t) => setForm((p) => ({ ...p, last_name: t }))}
                    placeholder="Last"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <EditField icon="mail-outline"          label="Email Address"         field="email"        placeholder="student@example.com (optional)" keyboardType="email-address" autoCapitalize="none" form={form} setForm={setForm} />
              <EditField icon="school-outline"        label="Program *"             field="program"      placeholder="e.g. BS Computer Science" form={form} setForm={setForm} />
              <EditField icon="person-circle-outline" label="Parent/Guardian Name"  field="parent_name"  placeholder="Parent/Guardian full name" form={form} setForm={setForm} />
              <EditField icon="mail-open-outline"     label="Parent/Guardian Email" field="parent_email" placeholder="parent@example.com" keyboardType="email-address" autoCapitalize="none" form={form} setForm={setForm} />
              <EditField icon="call-outline"          label="Mobile Number"         field="phone"        placeholder="+63 912 345 6789" keyboardType="phone-pad" autoCapitalize="none" form={form} setForm={setForm} />

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={COLORS.white} />
                    : <>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20 },
  headerContent:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton:     { padding: 8 },
  headerTitle:    { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  headerActions:  { flexDirection: 'row', alignItems: 'center' },
  headerBtn:      { padding: 8 },
  saveBtn:        { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, marginLeft: 4 },

  avatarSection:  { alignItems: 'center' },
  avatarCircle:   { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  studentName:    { fontSize: 22, fontWeight: 'bold', color: COLORS.white, textAlign: 'center' },
  studentIdText:  { fontSize: 14, color: COLORS.white, opacity: 0.85, marginTop: 4 },
  classBadge:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  classBadgeText: { fontSize: 13, color: COLORS.white, marginLeft: 6, fontWeight: '500' },

  content: { flex: 1, padding: 16 },

  rateCard:    { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  rateLabel:   { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  rateValue:   { fontSize: 42, fontWeight: 'bold', marginBottom: 12 },
  rateBarBg:   { width: '100%', height: 10, backgroundColor: COLORS.grayLight, borderRadius: 5, overflow: 'hidden' },
  rateBarFill: { height: '100%', borderRadius: 5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 14, alignItems: 'center', marginHorizontal: 4, borderTopWidth: 3, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  statNum:  { fontSize: 24, fontWeight: 'bold', marginTop: 6 },
  statLbl:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  section:      { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },

  infoRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoIcon:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoContent:{ flex: 1 },
  infoLabel:  { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  infoValue:  { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  editInput:  { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.background, marginBottom: 4 },
  nameEditRow:{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4 },

  actionButtons: { flexDirection: 'row', marginTop: 20 },
  cancelBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveButton:    { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, marginLeft: 8, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  saveBtnText:   { fontSize: 15, fontWeight: 'bold', color: COLORS.white, marginLeft: 8 },

  qrHint:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'center' },
  qrShot:     { alignSelf: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12 },
  qrContainer:{ alignItems: 'center' },
  qrNameBadge:{ marginTop: 12, alignItems: 'center', paddingHorizontal: 8 },
  qrNameText: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  qrIdText:   { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  qrLabel:    { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', marginTop: 12 },
  qrSub:      { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  downloadQrButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  downloadQrButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  histRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  histEven:         { backgroundColor: COLORS.background || '#f8f9fa' },
  histOdd:          { backgroundColor: '#fff' },
  histDate:         { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  histTime:         { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  histEmpty:        { alignItems: 'center', paddingVertical: 24, opacity: 0.6 },
  histEmptyText:    { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  statusBadge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusBadgeText:  { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});