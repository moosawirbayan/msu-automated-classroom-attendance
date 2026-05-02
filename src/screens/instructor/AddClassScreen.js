import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AddClassScreen({ navigation }) {
  const [classData, setClassData] = useState({
    class_name: '',
    class_code: '',
    section: '',
    description: '',
    start_time: new Date(),
    end_time: new Date(),
    days: [],
    room: '',
    notify_parents: true,
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day) => {
    setClassData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatTimeForDB = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  const handleSaveClass = async () => {
    if (!classData.class_name || !classData.class_code || !classData.section) {
      Alert.alert('Error', 'Please fill in all required fields (Class Name, Code, Section)');
      return;
    }

    if (classData.days.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const payload = {
        class_name: classData.class_name,
        class_code: classData.class_code,
        section: classData.section,
        description: classData.description,
        start_time: formatTimeForDB(classData.start_time),
        end_time: formatTimeForDB(classData.end_time),
        days: classData.days.join(', '),
        room: classData.room,
        is_active: true,
        notify_parents: classData.notify_parents,
      };

      const response = await api.post('/classes/index.php', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Alert.alert('Success', 'Class created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        setLoading(false);
        Alert.alert('Error', response.data.message || 'Failed to create class');
      }
    } catch (error) {
      console.error('Create class error:', error);
      setLoading(false);
      const errorMessage = error.response?.data?.message || 'Failed to create class. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Class</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>

          {/* Class Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mathematics"
              placeholderTextColor={COLORS.gray}
              value={classData.class_name}
              onChangeText={(text) => setClassData({...classData, class_name: text})}
            />
          </View>

          {/* Class Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., MATH101"
              placeholderTextColor={COLORS.gray}
              value={classData.class_code}
              onChangeText={(text) => setClassData({...classData, class_code: text})}
              autoCapitalize="characters"
            />
          </View>

          {/* Section only */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Section *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., A"
              placeholderTextColor={COLORS.gray}
              value={classData.section}
              onChangeText={(text) => setClassData({...classData, section: text})}
              autoCapitalize="characters"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter class description"
              placeholderTextColor={COLORS.gray}
              value={classData.description}
              onChangeText={(text) => setClassData({...classData, description: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Time Pickers */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.timeText}>{formatTime(classData.start_time)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>End Time *</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.timeText}>{formatTime(classData.end_time)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of Week */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Days *</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    classData.days.includes(day) && styles.dayChipSelected
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[
                    styles.dayChipText,
                    classData.days.includes(day) && styles.dayChipTextSelected
                  ]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Room */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Room 101"
              placeholderTextColor={COLORS.gray}
              value={classData.room}
              onChangeText={(text) => setClassData({...classData, room: text})}
            />
          </View>

          {/* Parent Notifications Toggle */}
          <View style={styles.toggleCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Parent Email Notifications</Text>
              <Text style={styles.toggleSubtitle}>Send parent emails when attendance is recorded</Text>
            </View>
            <Switch
              value={classData.notify_parents}
              onValueChange={(value) => setClassData({ ...classData, notify_parents: value })}
              trackColor={{ false: COLORS.grayLight, true: COLORS.success }}
              thumbColor={COLORS.white}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
            onPress={handleSaveClass}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Class'}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {showStartPicker && (
        <DateTimePicker
          value={classData.start_time}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (selectedDate) setClassData({...classData, start_time: selectedDate});
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={classData.end_time}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (selectedDate) setClassData({...classData, end_time: selectedDate});
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  content: { flex: 1 },
  formContainer: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  rowContainer: { flexDirection: 'row' },
  timeButton: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  timeText: { fontSize: 16, color: COLORS.textPrimary, marginLeft: 10, flex: 1 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  dayChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  dayChipTextSelected: { color: COLORS.white },
  toggleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18, backgroundColor: COLORS.white,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  toggleSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  saveButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 20, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  saveButtonDisabled: { backgroundColor: COLORS.gray, opacity: 0.6 },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginLeft: 10 },
});