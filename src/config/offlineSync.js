import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

const OFFLINE_QUEUE_KEY = 'offline_attendance_queue';

// ── Helper: get today's date in Manila time (YYYY-MM-DD) ──
const getManilaDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  // 'en-CA' = YYYY-MM-DD format
};

// ── Save attendance to offline queue ──
export const saveOfflineAttendance = async (studentId, classId, studentName) => {
  try {
    const existing = await getOfflineQueue();
    const todayManila = getManilaDate();

    // ✅ FIX: Huwag mag-save kung may existing na para sa same student+class+date
    const alreadyQueued = existing.some(
      (item) =>
        String(item.studentId) === String(studentId) &&
        String(item.classId) === String(classId) &&
        item.date === todayManila &&
        !item.synced
    );

    if (alreadyQueued) {
      console.log('[Offline] Already queued for today, skipping duplicate.');
      return false; // ✅ hindi na mag-double
    }

    const newEntry = {
      id: Date.now().toString(),
      studentId,
      classId,
      studentName,
      date: todayManila,                    // ✅ Manila date para sa duplicate check
      timestamp: new Date().toLocaleString('en-CA', {
        timeZone: 'Asia/Manila',
        hour12: false,
      }).replace(', ', 'T') + '+08:00',     // ✅ Manila datetime string
      synced: false,
    };

    const updated = [...existing, newEntry];
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('saveOfflineAttendance error:', error);
    return false;
  }
};

// ── Get offline queue ──
export const getOfflineQueue = async () => {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// ── Get count of unsynced records ──
export const getUnsyncedCount = async () => {
  const queue = await getOfflineQueue();
  return queue.filter((item) => !item.synced).length;
};

// ── Sync offline queue to backend ──
export const syncOfflineQueue = async () => {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return { synced: 0, failed: 0 };

  const queue = await getOfflineQueue();
  const unsynced = queue.filter((item) => !item.synced);
  if (unsynced.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const updatedQueue = [...queue];

  for (const item of unsynced) {
    try {
      const response = await api.post('/attendance/mark.php', {
        studentId: item.studentId,
        classId: item.classId,
        // ✅ Ipadala ang original na Manila date para gamitin ng backend
        attendanceDate: item.date,
      });

      if (response.data.success || response.data.message?.includes('already marked')) {
        // ✅ "already marked" = okay lang, ibig sabihin na-save na — i-mark as synced
        const idx = updatedQueue.findIndex((q) => q.id === item.id);
        if (idx !== -1) updatedQueue[idx].synced = true;
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  const remaining = updatedQueue.filter((item) => !item.synced);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));

  return { synced, failed };
};

// ── Check if internet is available ──
export const isOnline = async () => {
  const netState = await NetInfo.fetch();
  return netState.isConnected && netState.isInternetReachable;
};