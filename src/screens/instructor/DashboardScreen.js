import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

const { width } = Dimensions.get('window');

const STATUS_COLOR = {
  present: COLORS.success,
  absent:  COLORS.error,
  late:    '#f59e0b',
  excused: COLORS.info,
};

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    instructorName:   '',
    date:             '',
    enrolledStudents: 0,
    enrolledClasses:  0,
    presentToday:     0,
    absentToday:      0,
    attendanceRate:   0,
    recentAttendance: [],
    classBreakdown:   [],
    activeClasses:    [], // [{ id, class_code, class_name, subject, room, total_students }]
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await api.get('/dashboard/stats.php', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[Dashboard] activeClasses:", JSON.stringify(res.data?.data?.activeClasses));
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const user = JSON.parse(raw);
        setData(prev => ({ ...prev, instructorName: user.name || 'Instructor' }));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchData(true));
    return unsubscribe;
  }, [navigation, fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const totalToday = data.enrolledStudents ?? 0;
  const rate       = data.attendanceRate   ?? 0;
  const activeClasses = data.activeClasses ?? [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.headerSub}>Automated Classroom Attendance</Text>
        <Text style={styles.headerName}>
          {data.instructorName ? `Welcome, ${data.instructorName}` : 'Dashboard'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Date */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Ionicons name="stats-chart" size={22} color={COLORS.primary} />
            <Text style={styles.dashboardTitle}>Attendance Dashboard</Text>
          </View>
          <Text style={styles.dateText}>{data.date}</Text>
        </View>

        {/* Stats row 1 */}
        <View style={styles.statsRow}>
          <StatsCard
            icon="people"
            iconColor="#4a90e2"
            cardBg="#ddeeff"
            accentColor="#4a90e2"
            title="Enrolled Students"
            value={data.enrolledStudents}
            subtitle={`Across ${data.enrolledClasses} class${data.enrolledClasses !== 1 ? 'es' : ''}`}
          />
          <StatsCard
            icon="checkmark-circle"
            iconColor="#27ae60"
            cardBg="#d4f5e2"
            accentColor="#27ae60"
            title="Present Today"
            value={data.presentToday}
            subtitle={totalToday > 0 ? `${rate}% attendance rate` : 'No sessions today'}
          />
        </View>

        {/* Stats row 2 */}
        <View style={styles.statsRow}>
          <StatsCard
            icon="close-circle"
            iconColor="#e74c3c"
            cardBg="#fde8e8"
            accentColor="#e74c3c"
            title="Absent Today"
            value={data.absentToday}
            subtitle={totalToday > 0 ? `Out of ${totalToday} total enrolled` : 'No sessions today'}
          />
          <StatsCard
            icon="trending-up"
            iconColor={rate >= 75 ? '#f39c12' : '#e74c3c'}
            cardBg={rate >= 75 ? '#fef9e7' : '#fde8e8'}
            accentColor={rate >= 75 ? '#f39c12' : '#e74c3c'}
            title="Attendance Rate"
            value={`${rate}%`}
            subtitle={rate >= 75 ? 'Good standing' : rate > 0 ? 'Below threshold' : 'No data yet'}
          />
        </View>

        {/* Attendance Rate Card with Class Breakdown */}
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceCardHeader}>
            <Text style={styles.attendanceCardTitle}>Today's Attendance Rate</Text>
            <View style={[
              styles.rateBadge,
              { backgroundColor: rate >= 75 ? COLORS.successLight : rate > 0 ? COLORS.errorLight : COLORS.grayLight }
            ]}>
              <Text style={[
                styles.rateBadgeText,
                { color: rate >= 75 ? COLORS.success : rate > 0 ? COLORS.error : COLORS.gray }
              ]}>
                {rate >= 75 ? 'Good' : rate > 0 ? 'Low' : 'No Data'}
              </Text>
            </View>
          </View>

          <Text style={styles.attendanceCardSub}>
            {totalToday > 0
              ? `${data.presentToday} present · ${data.absentToday} absent · ${totalToday} total enrolled`
              : 'No attendance recorded today yet'}
          </Text>

          <Text style={[styles.percentageValue, {
            color: rate >= 75 ? COLORS.success : rate > 0 ? COLORS.error : COLORS.gray
          }]}>
            {rate}%
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${rate}%`,
              backgroundColor: rate >= 75 ? COLORS.success : COLORS.error,
            }]} />
          </View>

          {data.classBreakdown && data.classBreakdown.length > 0 && (
            <View style={styles.classBreakdownContainer}>
              <View style={styles.divider} />
              {data.classBreakdown.map((cls, idx) => {
                const classRate = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                const isGood = classRate >= 75;
                return (
                  <View key={idx} style={styles.classBreakdownItem}>
                    <View style={styles.classBreakdownLeft}>
                      <Text style={styles.classCode}>{cls.class_code}</Text>
                      <Text style={styles.className} numberOfLines={1}>{cls.class_name}</Text>
                    </View>
                    <View style={styles.classProgressWrapper}>
                      <View style={styles.classProgressBg}>
                        <View style={[
                          styles.classProgressFill,
                          { width: `${classRate}%`, backgroundColor: isGood ? COLORS.success : COLORS.error }
                        ]} />
                      </View>
                      <Text style={styles.classCountText}>{cls.present}/{cls.total}</Text>
                    </View>
                    <View style={[
                      styles.classRateBadge,
                      { backgroundColor: isGood ? COLORS.successLight : COLORS.errorLight }
                    ]}>
                      <Text style={[styles.classRateText, { color: isGood ? COLORS.success : COLORS.error }]}>
                        {classRate}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Active Classes Card ───────────────────────────────── */}
        <View style={styles.activeClassCard}>
          {/* Card Header */}
          <View style={styles.activeClassHeader}>
            <View style={styles.activeClassHeaderLeft}>
              <View style={styles.activePulse}>
                <View style={styles.activeDot} />
              </View>
              <Text style={styles.activeClassTitle}>Active Classes</Text>
            </View>
            <View style={styles.activeCountBadge}>
              <Text style={styles.activeCountText}>{activeClasses.length} Active</Text>
            </View>
          </View>

          {activeClasses.length > 0 ? (
            activeClasses.map((cls, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.activeClassItem,
                  idx < activeClasses.length - 1 && styles.activeClassItemBorder,
                ]}
                onPress={() => navigation.navigate('Classes')}
                activeOpacity={0.75}
              >
                {/* Left accent bar */}
                <View style={styles.activeClassAccent} />

                {/* Info */}
                <View style={styles.activeClassInfo}>
                  <View style={styles.activeClassTopRow}>
                    <Text style={styles.activeClassCode}>{cls.class_code}</Text>
                    <View style={styles.activeLiveBadge}>
                      <View style={styles.activeLiveDot} />
                      <Text style={styles.activeLiveText}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.activeClassName} numberOfLines={1}>{cls.class_name}</Text>
                  {cls.room ? (
                    <View style={styles.activeClassMeta}>
                      <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
                      <Text style={styles.activeClassMetaText}>{cls.room}</Text>
                      {cls.total_students != null && (
                        <>
                          <Text style={styles.activeClassMetaDot}>·</Text>
                          <Ionicons name="people-outline" size={11} color={COLORS.textSecondary} />
                          <Text style={styles.activeClassMetaText}>{cls.total_students} students</Text>
                        </>
                      )}
                    </View>
                  ) : cls.total_students != null ? (
                    <View style={styles.activeClassMeta}>
                      <Ionicons name="people-outline" size={11} color={COLORS.textSecondary} />
                      <Text style={styles.activeClassMetaText}>{cls.total_students} students</Text>
                    </View>
                  ) : null}
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noActiveClass}>
              <Ionicons name="book-outline" size={36} color={COLORS.gray} />
              <Text style={styles.noActiveClassText}>No active classes right now</Text>
              <Text style={styles.noActiveClassSub}>
                Activate a class from the Classes tab to start taking attendance
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtonsRow}>
            <ActionButton
              icon="scan"
              label="Scan QR"
              color={COLORS.primary}
              onPress={() => navigation.navigate('Scanner')}
            />
            <ActionButton
              icon="people-outline"
              label="Classes"
              color={COLORS.info}
              onPress={() => navigation.navigate('Classes')}
            />
            <ActionButton
              icon="document-text"
              label="Reports"
              color={COLORS.secondary}
              onPress={() => navigation.navigate('Classes')}
            />
            <ActionButton
              icon="person"
              label="Profile"
              color={COLORS.gray}
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {data.recentAttendance && data.recentAttendance.length > 0
            ? [...data.recentAttendance]
                .sort((a, b) => new Date(b.checkin_time) - new Date(a.checkin_time))
                .map((item, idx) => (
                  <ActivityItem
                    key={idx}
                    title={item.student_name}
                    subtitle={`${item.class_code} · Marked ${item.status}`}
                    time={item.checkin_time}
                    icon={
                      item.status === 'present' ? 'checkmark-circle'
                      : item.status === 'late'  ? 'time'
                      : 'close-circle'
                    }
                    iconColor={STATUS_COLOR[item.status] || COLORS.gray}
                  />
                ))
            : (
              <View style={styles.emptyActivity}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.gray} />
                <Text style={styles.emptyText}>No recent attendance records</Text>
              </View>
            )
          }
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ─────────────────────────────────── */

const formatDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
  });
};

const StatsCard = ({ icon, iconColor, cardBg, accentColor, title, value, subtitle }) => (
  <View style={[styles.statsCard, { borderColor: accentColor, borderWidth: 1.5, borderLeftWidth: 5 }]}>
    <View style={[styles.statsIconContainer, { backgroundColor: cardBg }]}>
      <Ionicons name={icon} size={26} color={iconColor} />
    </View>
    <Text style={styles.statsTitle}>{title}</Text>
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsSubtitle}>{subtitle}</Text>
  </View>
);

const ActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
      <Ionicons name={icon} size={22} color={COLORS.white} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ActivityItem = ({ title, subtitle, time, icon, iconColor }) => (
  <View style={styles.activityItem}>
    <View style={[styles.activityIconContainer, { backgroundColor: iconColor + '20' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activitySubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.activityTime}>{formatDate(time)}</Text>
  </View>
);

/* ─── Styles ─────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: COLORS.background },
  header:               { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerSub:            { fontSize: 12, color: COLORS.white, opacity: 0.85 },
  headerName:           { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginTop: 4 },
  content:              { flex: 1, padding: 16 },
  titleSection:         { marginBottom: 16 },
  titleRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dashboardTitle:       { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginLeft: 8 },
  dateText:             { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statsRow:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  statsCard:            { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, width: (width - 48) / 2, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  statsIconContainer:   { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statsTitle:           { fontSize: 11, color: '#555', marginBottom: 6 },
  statsValue:           { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 2 },
  statsSubtitle:        { fontSize: 10, color: '#666' },

  /* Attendance Card */
  attendanceCard:       { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  attendanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  attendanceCardTitle:  { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  rateBadge:            { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  rateBadgeText:        { fontSize: 11, fontWeight: '600' },
  attendanceCardSub:    { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  percentageValue:      { fontSize: 46, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  progressBarBg:        { width: '100%', height: 12, backgroundColor: COLORS.grayLight, borderRadius: 6, overflow: 'hidden' },
  progressBarFill:      { height: '100%', borderRadius: 6 },

  /* Class Breakdown */
  classBreakdownContainer: { marginTop: 4 },
  divider:              { height: 1, backgroundColor: COLORS.grayLight, marginVertical: 14 },
  classBreakdownItem:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  classBreakdownLeft:   { width: 90, marginRight: 10 },
  classCode:            { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  className:            { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  classProgressWrapper: { flex: 1, marginRight: 10 },
  classProgressBg:      { height: 8, backgroundColor: COLORS.grayLight, borderRadius: 4, overflow: 'hidden', marginBottom: 3 },
  classProgressFill:    { height: '100%', borderRadius: 4 },
  classCountText:       { fontSize: 10, color: COLORS.textSecondary },
  classRateBadge:       { minWidth: 44, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignItems: 'center' },
  classRateText:        { fontSize: 12, fontWeight: '700' },

  /* ── Active Classes Card ── */
  activeClassCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  activeClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeClassHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePulse: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success + '25',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  activeClassTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  activeCountBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  activeClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeClassItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  activeClassAccent: {
    width: 4,
    height: 44,
    borderRadius: 2,
    backgroundColor: COLORS.success,
    marginRight: 12,
  },
  activeClassInfo: {
    flex: 1,
  },
  activeClassTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeClassCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  activeLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.error,
    marginRight: 4,
  },
  activeLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.error,
    letterSpacing: 0.5,
  },
  activeClassName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  activeClassMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeClassMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  activeClassMetaDot: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  noActiveClass: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noActiveClassText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  noActiveClassSub: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  /* Quick Actions */
  section:              { marginBottom: 20 },
  sectionTitle:         { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  actionButtonsRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton:         { alignItems: 'center', width: (width - 64) / 4 },
  actionIconContainer:  { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel:          { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  /* Activity */
  activityItem:         { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 8, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
  activityIconContainer:{ width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  activityContent:      { flex: 1 },
  activityTitle:        { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  activitySubtitle:     { fontSize: 11, color: COLORS.textSecondary },
  activityTime:         { fontSize: 11, color: COLORS.textSecondary, marginLeft: 6 },
  emptyActivity:        { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyText:            { marginTop: 8, fontSize: 13, color: COLORS.textSecondary },
});
