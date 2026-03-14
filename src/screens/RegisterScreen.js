import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import api from '../config/api';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    console.log('=== Registration Started ===');
    console.log('Form Data:', {
      fullName: formData.fullName,
      email: formData.email,
      department: formData.department,
      employeeId: formData.employeeId,
      hasPassword: !!formData.password
    });

    // Validation
    if (!formData.fullName || !formData.email || !formData.department || 
        !formData.employeeId || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    console.log('Validation passed, sending API request...');

    try {
      const payload = {
        name: formData.fullName,
        email: formData.email.trim(),
        department: formData.department,
        employee_id: formData.employeeId,
        password: formData.password
      };
      
      console.log('API Endpoint:', '/auth/register.php');
      console.log('Payload:', { ...payload, password: '***' });

      const response = await api.post('/auth/register.php', payload);

      console.log('API Response:', response.data);

      if (response.data.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created. You can now login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', response.data.message || 'Please try again');
      }
    } catch (error) {
      console.error('=== Registration Error ===');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Response Status:', error.response?.status);
      console.error('Response Data:', error.response?.data);
      console.error('Request Config:', error.config?.url);

      const errors = error.response?.data?.errors;

      if (errors) {
        // Validation errors from server
        const errorText = Object.values(errors).join('\n');
        Alert.alert('Validation Error', errorText);
      } else if (error.response) {
        // Server responded with an error (4xx/5xx)
        const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        Alert.alert('Registration Failed', errorMessage);
      } else if (error.request) {
        // Request was sent but no response received — server may have processed it
        Alert.alert(
          'Connection Issue',
          'The request was sent but we did not receive a response. Your account may have been created successfully.\n\nPlease try logging in. If you cannot login, try registering again.',
          [
            {
              text: 'Try Login',
              onPress: () => navigation.navigate('Login')
            },
            {
              text: 'Stay Here',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Registration Error', 'Unable to connect to server. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
      console.log('=== Registration Completed ===');
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/Automated-Classroom-Attendance-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.universityText}>Automated Classroom Attendance</Text>
            <Text style={styles.titleText}>Instructor Registration</Text>
          </View>

          {/* Registration Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Create New Account</Text>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({...formData, fullName: text})}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="instructor@example.com"
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Department */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Computer Science"
                  value={formData.department}
                  onChangeText={(text) => setFormData({...formData, department: text})}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Employee ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee ID *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your employee ID"
                  value={formData.employeeId}
                  onChangeText={(text) => setFormData({...formData, employeeId: text})}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login here</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  universityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    marginLeft: 8,
  },
});
