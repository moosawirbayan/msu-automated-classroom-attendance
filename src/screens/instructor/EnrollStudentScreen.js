import React, { useState } from 'react';
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
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

export default function EnrollStudentScreen({ route, navigation }) {
  const { classData } = route.params;
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState({
    student_id: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    program: '',
    email: '',
    parent_name: '',
    parent_email: '',
    mobile_number: '',
  });

  const handleEnrollStudent = async () => {
    // Validation
    if (!studentData.student_id.trim()) {
      Alert.alert('Validation Error', 'Student ID is required');
      return;
    }
    if (!studentData.first_name.trim()) {
      Alert.alert('Validation Error', 'First Name is required');
      return;
    }
    if (!studentData.last_name.trim()) {
      Alert.alert('Validation Error', 'Last Name is required');
      return;
    }
    if (!studentData.program.trim()) {
      Alert.alert('Validation Error', 'Program is required');
      return;
    }
    if (!studentData.mobile_number.trim()) {
      Alert.alert('Validation Error', 'Mobile Number is required');
      return;
    }
    if (studentData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (studentData.parent_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.parent_email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid parent email address');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const payload = {
        class_id: classData.id,
        student_id: studentData.student_id.trim(),
        first_name: studentData.first_name.trim(),
        middle_initial: studentData.middle_initial.trim(),
        last_name: studentData.last_name.trim(),
        program: studentData.program.trim(),
        email: studentData.email.trim(),
        parent_name: studentData.parent_name.trim(),
        parent_email: studentData.parent_email.trim(),
        mobile_number: studentData.mobile_number.trim(),
      };

      const response = await api.post('/enrollments/enroll.php', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Alert.alert('Success', 'Student enrolled successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to enroll student');
      }
    } catch (error) {
      console.error('Enroll student error:', error);
      if (error.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else {
        Alert.alert('Error', 'Failed to enroll student. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enroll Student</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Add student to {classData.class_name}
        </Text>
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
        {/* Student Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={48} color={COLORS.primary} />
          </View>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {/* Student ID */}
          <Text style={styles.label}>Student ID *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2025-001"
            value={studentData.student_id}
            onChangeText={(text) => setStudentData({ ...studentData, student_id: text })}
            autoCapitalize="none"
          />

          {/* Name Row */}
          <View style={styles.nameRow}>
            <View style={[styles.nameField, { flex: 2 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan"
                value={studentData.first_name}
                onChangeText={(text) => setStudentData({ ...studentData, first_name: text })}
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.nameField, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>M.I.</Text>
              <TextInput
                style={styles.input}
                placeholder="D."
                value={studentData.middle_initial}
                onChangeText={(text) => setStudentData({ ...studentData, middle_initial: text })}
                autoCapitalize="characters"
                maxLength={3}
              />
            </View>

            <View style={[styles.nameField, { flex: 2, marginLeft: 8 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Dela Cruz"
                value={studentData.last_name}
                onChangeText={(text) => setStudentData({ ...studentData, last_name: text })}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="student@example.com (optional)"
            value={studentData.email}
            onChangeText={(text) => setStudentData({ ...studentData, email: text })}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Program *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., BS Computer Science"
            value={studentData.program}
            onChangeText={(text) => setStudentData({ ...studentData, program: text })}
            autoCapitalize="words"
          />

          {/* Parent/Guardian Information */}
          <Text style={styles.sectionHeader}>Parent/Guardian Information</Text>
          
          <Text style={styles.label}>Parent/Guardian Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            value={studentData.parent_name}
            onChangeText={(text) => setStudentData({ ...studentData, parent_name: text })}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Parent/Guardian Email</Text>
          <TextInput
            style={styles.input}
            placeholder="parent@example.com"
            value={studentData.parent_email}
            onChangeText={(text) => setStudentData({ ...studentData, parent_email: text })}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+63 912 345 6789"
            value={studentData.mobile_number}
            onChangeText={(text) => setStudentData({ ...studentData, mobile_number: text })}
            keyboardType="phone-pad"
          />
          <Text style={styles.helperText}>
            SMS notifications will be sent to this number
          </Text>

          {/* QR Code Generation Info */}
          <View style={styles.qrInfoCard}>
            <View style={styles.qrInfoHeader}>
              <Ionicons name="qr-code" size={24} color={COLORS.success} />
              <Text style={styles.qrInfoTitle}>QR Code Generation</Text>
            </View>
            <Text style={styles.qrInfoText}>
              A unique QR code will be automatically generated for this student. 
              This code is specific to this class only.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.enrollButton, loading && styles.enrollButtonDisabled]}
            onPress={handleEnrollStudent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.enrollButtonText}>Enroll Student</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  nameRow: {
    flexDirection: 'row',
  },
  nameField: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  qrInfoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  qrInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 8,
  },
  qrInfoText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  enrollButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  enrollButtonDisabled: {
    opacity: 0.6,
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
});
