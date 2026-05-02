import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

const STATUSES = [
  { key: 'present', label: 'P', fullLabel: 'Present', color: COLORS.success },
  { key: 'absent',  label: 'A', fullLabel: 'Absent',  color: COLORS.error   },
];

function todayString() {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  const d     = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ManualAttendanceScreen({ route, navigation }) {
  const { classData } = route.params;

  const [date, setDate]             = useState(todayString());
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (selectedDate) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // 1. Fetch enrolled students
      const studRes = await api.get(
        `/enrollments/get_students.php?class_id=${classData.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!studRes.data.success) throw new Error('Failed to load students');
      const enrolled = studRes.data.students || [];

      // 2. Fetch existing attendance — for display reference only (not pre-selected)
      let existingMap = {};
      try {
        const attRes = await api.get(
          `/attendance/get_class_attendance.php?class_id=${classData.id}&date=${selectedDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (attRes.data.success) {
          (attRes.data.records || []).forEach(r => {
            existingMap[Number(r.student_id)] = r.status;
          });
        }
      } catch (_) {}

      // 3. All students start with null (unselected)
      //    existingStatus shown as reference badge only
      const merged = enrolled.map(s => ({
        ...s,
        status: null,                              // ✅ always unselected on open
        existingStatus: existingMap[Number(s.id)] ?? null, // for display reference
      }));

      setStudents(merged);
    } catch (err) {
      console.error('Manual attendance load error:', err);
      Alert.alert('Error', 'Failed to load students.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classData.id]);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(date); };

  const setStudentStatus = (studentId, status) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId
        // ✅ tap same button again = deselect (back to null)
        ? { ...s, status: s.status === status ? null : status }
        : s
    ));
  };

  const markAll = (status) => {
    Alert.alert(
      `Mark All ${STATUSES.find(s => s.key === status).fullLabel}?`,
      `This will select ${status} for all ${students.length} students.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => setStudents(prev => prev.map(s => ({ ...s, status }))) },
      ]
    );
  };

  const clearAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: null })));
  };

  const handleSave = async () => {
    if (students.length === 0) return;

    // ✅ Only save selected students — skip nulls
    const records = students
      .filter(s => s.status !== null)
      .map(s => ({ studentId: s.id, status: s.status }));

    if (records.length === 0) {
      Alert.alert('Nothing to Save', 'Please select at least one student status (P or A) before saving.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      const res = await api.post(
        '/attendance/manual_mark.php',
        { classId: classData.id, date, records },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Alert.alert(
          '✓ Saved',
          `Updated ${records.length} student(s).\n${res.data.message || ''}`,
        );
        fetchData(date); // refresh to show updated existingStatus
      } else {
        Alert.alert('Error', res.data.message || 'Failed to save attendance.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (days) => {
    const d    = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    setLoading(true);
    setDate(`${yyyy}-${mm}-${dd}`);
  };

  const selectedCount   = students.filter(s => s.status !== null).length;
  const presentCount    = students.filter(s => s.status === 'present').length;
  const absentCount     = students.filter(s => s.status === 'absent').length;
  const unselectedCount = students.filter(s => s.status === null).length;

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Manual Attendance</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {classData.class_name}{classData.section ? ` · ${classData.section}` : ''}
            </Text>
          </View>
          {saving
            ? <ActivityIndicator color="#fff" />
            : (
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, selectedCount === 0 && { opacity: 0.5 }]}
                disabled={students.length === 0}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            )
          }
        </View>
      </LinearGradient>

      {/* ── Date Navigator ── */}
      <View style={styles.dateBar}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
          {date === todayString() && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>Today</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => shiftDate(1)}
          style={styles.dateArrow}
          disabled={date === todayString()}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={date === todayString() ? COLORS.gray : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Summary Bar ── */}
      {!loading && students.length > 0 && (
        <View style={styles.summaryBar}>
          {presentCount > 0 && (
            <Text style={[styles.summaryItem, { color: COLORS.success }]}>
              ✓ {presentCount} P
            </Text>
          )}
          {absentCount > 0 && (
            <Text style={[styles.summaryItem, { color: COLORS.error }]}>
              ✗ {absentCount} A
            </Text>
          )}
          {unselectedCount > 0 && (
            <Text style={[styles.summaryItem, { color: COLORS.gray }]}>
              ○ {unselectedCount} Unselected
            </Text>
          )}
          <View style={styles.summaryActions}>
            <TouchableOpacity style={styles.markAllBtn} onPress={() => markAll('present')}>
              <Text style={styles.markAllText}>All P</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.markAllBtn, { backgroundColor: COLORS.error + '20' }]}
              onPress={() => markAll('absent')}
            >
              <Text style={[styles.markAllText, { color: COLORS.error }]}>All A</Text>
            </TouchableOpacity>
            {selectedCount > 0 && (
              <TouchableOpacity
                style={[styles.markAllBtn, { backgroundColor: COLORS.gray + '20' }]}
                onPress={clearAll}
              >
                <Text style={[styles.markAllText, { color: COLORS.gray }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Student List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading students…</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={56} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No Students Enrolled</Text>
          <Text style={styles.emptySubtitle}>Enroll students to take attendance.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {students.map((student, idx) => {
            const fullName = [
              student.first_name,
              student.middle_initial ? student.middle_initial + '.' : null,
              student.last_name,
            ].filter(Boolean).join(' ');

            return (
              <View
                key={student.id}
                style={[
                  styles.studentRow,
                  idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                ]}
              >
                {/* Name + existing status badge */}
                <View style={styles.nameCol}>
                  <Text style={styles.indexNum}>{idx + 1}</Text>
                  <View>
                    <Text style={styles.studentName} numberOfLines={1}>{fullName}</Text>
                    <View style={styles.studentMeta}>
                      <Text style={styles.studentIdText}>{student.student_id}</Text>
                      {/* ✅ Show existing DB status as small badge — reference only */}
                      {student.existingStatus && (
                        <View style={[
                          styles.existingBadge,
                          {
                            backgroundColor:
                              student.existingStatus === 'present' ? COLORS.success + '20'
                              : student.existingStatus === 'late'  ? '#f59e0b20'
                              : COLORS.error + '20',
                          },
                        ]}>
                          <Text style={[
                            styles.existingBadgeText,
                            {
                              color:
                                student.existingStatus === 'present' ? COLORS.success
                                : student.existingStatus === 'late'  ? '#f59e0b'
                                : COLORS.error,
                            },
                          ]}>
                            {student.existingStatus === 'present' ? '● Present'
                              : student.existingStatus === 'late'  ? '● Late'
                              : '● Absent'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* ✅ Status Buttons — all unselected on open */}
                <View style={styles.statusButtons}>
                  {STATUSES.map(st => {
                    const isSelected = student.status === st.key;
                    return (
                      <TouchableOpacity
                        key={st.key}
                        style={[
                          styles.statusBtn,
                          isSelected && {
                            backgroundColor: st.color,
                            borderColor: st.color,
                          },
                        ]}
                        onPress={() => setStudentStatus(student.id, st.key)}
                      >
                        <Text style={[
                          styles.statusBtnText,
                          isSelected && { color: '#fff' },
                        ]}>
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Info note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle-outline" size={15} color={COLORS.textSecondary} />
            <Text style={styles.infoNoteText}>
              Only selected (P/A) students will be saved. Unselected students are not affected.
            </Text>
          </View>

          {/* Bottom Save Button */}
          <TouchableOpacity
            style={[styles.bottomSaveBtn, (saving || selectedCount === 0) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving || selectedCount === 0}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.bottomSaveBtnText}>
                    Save {selectedCount > 0 ? `(${selectedCount} selected)` : ''}
                  </Text>
                </>
            }
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },

  dateBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, paddingVertical: 10,
    paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight,
  },
  dateArrow: { padding: 8 },
  dateCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  dateText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 6 },
  todayBadge: {
    backgroundColor: COLORS.primary + '20', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8,
  },
  todayText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    backgroundColor: COLORS.white, paddingHorizontal: 16,
    paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight, gap: 8,
  },
  summaryItem: { fontSize: 13, fontWeight: '600' },
  summaryActions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  markAllBtn: {
    backgroundColor: COLORS.success + '20', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  markAllText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },

  list: { flex: 1 },

  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLight,
  },
  rowEven: { backgroundColor: COLORS.white },
  rowOdd:  { backgroundColor: '#f8f9fa' },

  nameCol: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  indexNum: { fontSize: 12, color: COLORS.textSecondary, width: 24, fontWeight: '600' },
  studentName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, maxWidth: 160 },
  studentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  studentIdText: { fontSize: 11, color: COLORS.textSecondary },

  // ✅ Existing status badge — reference only, not a button
  existingBadge: {
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1,
  },
  existingBadgeText: { fontSize: 10, fontWeight: '600' },

  statusButtons: { flexDirection: 'row', gap: 6 },
  statusBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: COLORS.grayLight,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  statusBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 16, marginTop: 12, gap: 6,
    backgroundColor: '#f0f9ff', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#bae6fd',
  },
  infoNoteText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },

  bottomSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, margin: 16, paddingVertical: 16,
    borderRadius: 14, elevation: 3,
  },
  bottomSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});