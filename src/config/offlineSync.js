import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

const OFFLINE_QUEUE_KEY = 'offline_attendance_queue';

// ── Save attendance to offline queue ──
export const saveOfflineAttendance = async (studentId, classId, studentName) => {
  try {
    const existing = await getOfflineQueue();
    const newEntry = {
      id: Date.now().toString(),
      studentId,
      classId,
      studentName,
      timestamp: new Date().toISOString(),
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
      });

      if (response.data.success) {
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

  // Remove synced items, keep failed for retry
  const remaining = updatedQueue.filter((item) => !item.synced);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));

  return { synced, failed };
};

// ── Check if internet is available ──
export const isOnline = async () => {
  const netState = await NetInfo.fetch();
  return netState.isConnected && netState.isInternetReachable;
};
