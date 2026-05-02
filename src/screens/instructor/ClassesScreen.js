import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

// ─────────────────────────────────────────────
// Helper: Parse "HH:MM:SS" or "HH:MM" → { hours, minutes }
// ─────────────────────────────────────────────
const parseTime = (timeString) => {
  if (!timeString) return null;
  const parts = timeString.split(':');
  return {
    hours: parseInt(parts[0], 10),
    minutes: parseInt(parts[1], 10),
  };
};

// ─────────────────────────────────────────────
// Helper: Get current time as { hours, minutes }
// ─────────────────────────────────────────────
const getCurrentTime = () => {
  const now = new Date();
  return { hours: now.getHours(), minutes: now.getMinutes() };
};

// ─────────────────────────────────────────────
// Helper: Convert time object to total minutes
// ─────────────────────────────────────────────
const toMinutes = ({ hours, minutes }) => hours * 60 + minutes;

// ─────────────────────────────────────────────
// Helper: Check if today matches class schedule days
// ─────────────────────────────────────────────
const isTodayScheduled = (daysString) => {
  if (!daysString) return false;

  const dayMap = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };

  const todayIndex = new Date().getDay();

  const scheduledDays = daysString
    .split(',')
    .map((d) => d.trim().toLowerCase());

  return scheduledDays.some((d) => dayMap[d] === todayIndex);
};

// ─────────────────────────────────────────────
// Helper: Determine if class SHOULD be active right now
// Returns: 'active' | 'inactive'
// ─────────────────────────────────────────────
const computeDesiredActiveState = (classData) => {
  if (!isTodayScheduled(classData.days)) return 'inactive';

  const start = parseTime(classData.start_time);
  const end = parseTime(classData.end_time);
  if (!start || !end) return 'inactive';

  const nowMinutes = toMinutes(getCurrentTime());
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
    return 'active';
  }
  return 'inactive';
};

// ─────────────────────────────────────────────
// Helper: Check if class has ended today
// Returns true kapag: scheduled today AND past end_time na
// ─────────────────────────────────────────────
const hasClassEndedToday = (classData) => {
  if (!isTodayScheduled(classData.days)) return false;

  const end = parseTime(classData.end_time);
  if (!end) return false;

  const nowMinutes = toMinutes(getCurrentTime());
  const endMinutes = toMinutes(end);

  return nowMinutes >= endMinutes;
};

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function ClassesScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.get('/classes/index.php', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Classes fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchClasses();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  const handleDeleteClass = async (classId) => {
    Alert.alert('Delete Class', 'Are you sure you want to delete this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('authToken');
            await api.delete(`/classes/index.php?id=${classId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchClasses();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete class');
          }
        },
      },
    ]);
  };

  const filteredClasses = classes.filter(
    (cls) =>
      cls.class_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.class_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Classes</Text>
        <Text style={styles.headerSubtitle}>Manage your class schedules</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Add Class Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddClass')}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add New Class</Text>
        </TouchableOpacity>

        {/* Classes List */}
        <ScrollView
          style={styles.classList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          {filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              classData={cls}
              onDelete={() => handleDeleteClass(cls.id)}
              onRefresh={fetchClasses}
              navigation={navigation}
            />
          ))}

          {filteredClasses.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyStateText}>No classes found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// CLASS CARD (with auto-activate/deactivate + auto-absent logic)
// ─────────────────────────────────────────────
const ClassCard = ({ classData, onDelete, onRefresh, navigation }) => {
  const [isActive, setIsActive] = useState(Boolean(Number(classData.is_active)));
  const [notifyParents, setNotifyParents] = useState(
    Boolean(Number(classData.notify_parents ?? 1))
  );
  const [updating, setUpdating] = useState(false);

  // Track the last state we already pushed to the API to avoid duplicate calls
  const lastPushedState = useRef(null);
  // Track if teacher manually overrode within the current class window
  const manualOverride = useRef(false);
  // ✅ Track if auto-absent was already triggered today for this class
  // Key: "classId_YYYY-MM-DD" para reset sa susunod na araw
  const autoAbsentTriggered = useRef(null);

  // ── Auto-activate / deactivate + auto-absent logic ───
  useEffect(() => {
    const checkAndToggle = async () => {
      const desired = computeDesiredActiveState(classData);
      const shouldBeActive = desired === 'active';

      // If teacher manually overrode, respect it ONLY within the current window.
      // Once the window changes (e.g. class ends), clear the override.
      if (manualOverride.current) {
        const currentDesired = desired;
        if (lastPushedState.current !== null && currentDesired !== lastPushedState.current) {
          manualOverride.current = false;
        } else {
          return; // Still in same window — respect manual override
        }
      }

      // ✅ AUTO-ABSENT CHECK
      // Triggered kapag: scheduled today + past end_time + hindi pa na-trigger ngayon
      const todayKey = `${classData.id}_${new Date().toISOString().split('T')[0]}`;
      const classEnded = hasClassEndedToday(classData);

      if (classEnded && autoAbsentTriggered.current !== todayKey) {
        autoAbsentTriggered.current = todayKey; // I-mark agad para hindi mag-double trigger

        try {
          const token = await AsyncStorage.getItem('authToken');
          const absentRes = await api.post(
            '/attendance/mark_auto_absent.php',
            { class_id: classData.id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (absentRes.data?.marked > 0) {
            console.log(
              `✅ Auto-absent: ${absentRes.data.marked} student(s) marked absent for class ${classData.id}`
            );
          }
        } catch (absentErr) {
          // Non-blocking — i-reset ang trigger key para masubukan ulit sa susunod
          console.error('Auto-absent error:', absentErr);
          autoAbsentTriggered.current = null;
        }
      }

      // Skip active/inactive API call if we already pushed this exact state
      if (lastPushedState.current === shouldBeActive) return;

      // Update local UI immediately
      setIsActive(shouldBeActive);
      lastPushedState.current = shouldBeActive;

      try {
        const token = await AsyncStorage.getItem('authToken');
        await api.put(
          '/classes/index.php',
          { id: classData.id, is_active: shouldBeActive },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Auto-toggle error:', error);
        setIsActive(!shouldBeActive);
        lastPushedState.current = null;
      }
    };

    // Run immediately on mount
    checkAndToggle();

    // Check every 30 seconds
    const interval = setInterval(checkAndToggle, 30 * 1000);

    return () => clearInterval(interval);
  }, [classData.id, classData.days, classData.start_time, classData.end_time]);
  // ──────────────────────────────────────────────────────

  // Manual toggle (teacher can still override within current window)
  const handleToggleActive = async (value) => {
    manualOverride.current = true;
    lastPushedState.current = value;

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await api.put(
        '/classes/index.php',
        { id: classData.id, is_active: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsActive(value);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Toggle active error:', error);
      Alert.alert('Error', 'Failed to update class status');
      setIsActive(!value);
      lastPushedState.current = null;
      manualOverride.current = false;
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleNotifications = async (value) => {
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await api.put(
        '/classes/index.php',
        { id: classData.id, notify_parents: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifyParents(value);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Toggle notifications error:', error);
      Alert.alert('Error', 'Failed to update notification setting');
      setNotifyParents(!value);
    } finally {
      setUpdating(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const scheduleDisplay =
    classData.days && classData.start_time && classData.end_time
      ? `${classData.days} • ${formatTime(classData.start_time)} - ${formatTime(classData.end_time)}`
      : 'No schedule set';

  return (
    <TouchableOpacity
      style={styles.classCard}
      onPress={() => navigation.navigate('ClassDetail', { classData })}
      activeOpacity={0.7}
    >
      {/* Active/Inactive Toggle */}
      <View
        style={styles.statusToggleContainer}
        onStartShouldSetResponder={() => true}
        onResponderRelease={(e) => e.stopPropagation()}
      >
        <View style={styles.statusTextContainer}>
          <Ionicons
            name={isActive ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={isActive ? COLORS.success : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? COLORS.success : COLORS.textSecondary },
            ]}
          >
            {isActive ? 'Class is active' : 'Class is inactive'}
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={handleToggleActive}
          trackColor={{ false: COLORS.grayLight, true: COLORS.success }}
          thumbColor={COLORS.white}
          disabled={updating}
        />
      </View>

      {/* Notify Parents Toggle */}
      <View
        style={styles.statusToggleContainer}
        onStartShouldSetResponder={() => true}
        onResponderRelease={(e) => e.stopPropagation()}
      >
        <View style={styles.statusTextContainer}>
          <Ionicons
            name={notifyParents ? 'mail-open' : 'mail-unread-outline'}
            size={18}
            color={notifyParents ? COLORS.info : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.statusText,
              { color: notifyParents ? COLORS.info : COLORS.textSecondary },
            ]}
          >
            {notifyParents ? 'Parent notifications on' : 'Parent notifications off'}
          </Text>
        </View>
        <Switch
          value={notifyParents}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: COLORS.grayLight, true: COLORS.info }}
          thumbColor={COLORS.white}
          disabled={updating}
        />
      </View>

      {/* Auto-schedule notice */}
      {classData.days && classData.start_time && classData.end_time && (
        <View style={styles.autoScheduleNotice}>
          <Ionicons name="time-outline" size={14} color={COLORS.primary} />
          <Text style={styles.autoScheduleText}>
            Auto-manages: {classData.days} •{' '}
            {formatTime(classData.start_time)} – {formatTime(classData.end_time)}
          </Text>
        </View>
      )}

      {!isActive && (
        <View style={styles.inactiveNotice}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.warning} />
          <Text style={styles.inactiveNoticeText}>
            Activate class to enable QR scanning
          </Text>
        </View>
      )}

      {/* Card Header */}
      <View style={styles.classCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.classCode}>{classData.class_code}</Text>
          <Text style={styles.className}>{classData.class_name}</Text>
          {classData.section && (
            <Text style={styles.sectionText}>{classData.section}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Card Body */}
      <View style={styles.classCardBody}>
        <View style={styles.scheduleContainer}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.scheduleText}>{scheduleDisplay}</Text>
        </View>
        {classData.room && (
          <View style={styles.scheduleContainer}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.scheduleText}>{classData.room}</Text>
          </View>
        )}
      </View>

      {/* Card Footer */}
      <View style={styles.classCardFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ClassDetail', { classData });
          }}
        >
          <Ionicons name="list" size={18} color={COLORS.info} />
          <Text style={styles.actionButtonText}>View Students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ClassReport', { classData });
          }}
        >
          <Ionicons name="document-text" size={18} color={COLORS.secondary} />
          <Text style={styles.actionButtonText}>Report</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  classList: {
    flex: 1,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  autoScheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  autoScheduleText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  inactiveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  inactiveNoticeText: {
    fontSize: 12,
    color: COLORS.warning,
    marginLeft: 6,
  },
  sectionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  classCardBody: {
    marginBottom: 12,
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  classCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginLeft: 20,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 450,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: COLORS.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  saveButtonText: {
    textAlign: 'center',
    color: COLORS.white,
    fontWeight: '600',
  },
});