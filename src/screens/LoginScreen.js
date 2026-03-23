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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import api from '../config/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const buildErrorDetails = (error, actionName) => {
    const cfg = (error && error.config) ? error.config : {};
    const rsp = (error && error.response) ? error.response : null;
    const req = (error && error.request) ? error.request : null;

    const baseURL = cfg.baseURL || api.defaults.baseURL || 'Unknown base URL';
    const endpoint = cfg.url || 'Unknown endpoint';
    const fullUrl = String(baseURL) + String(endpoint);

    if (rsp) {
      const serverMessage = (rsp.data && rsp.data.message)
        ? rsp.data.message
        : ('Server returned ' + rsp.status);

      return {
        title: actionName + ' Failed',
        userMessage: serverMessage + '\n\nURL: ' + fullUrl + '\nStatus: ' + rsp.status,
      };
    }

    if (req) {
      return {
        title: actionName + ' Failed',
        userMessage:
          'No response from backend server.\n\n' +
          'URL: ' + fullUrl + '\n' +
          'Code: ' + (error && error.code ? error.code : 'N/A') + '\n' +
          'Timeout: ' + (cfg.timeout || 'N/A') + ' ms\n\n' +
          'Check if PHP server is running and phone can open this URL in browser.',
      };
    }

    return {
      title: actionName + ' Failed',
      userMessage: (error && error.message) ? error.message : 'Unexpected request error.',
    };
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert('Forgot Password', 'Please type your email first, then tap Forgot Password again.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot_password.php', { email: cleanEmail });
      Alert.alert('Success', response.data.message || 'A temporary password has been sent to your email.');
    } catch (error) {
      const details = buildErrorDetails(error, 'Reset Password');
      Alert.alert(details.title, details.userMessage);
      console.error('Reset password error details:', {
        code: error && error.code,
        message: error && error.message,
        baseURL: (error && error.config && error.config.baseURL) || api.defaults.baseURL,
        endpoint: error && error.config && error.config.url,
        status: error && error.response && error.response.status,
        response: error && error.response && error.response.data,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login.php', {
        email: email.trim(),
        password
      });

      if (response.data.success) {
        // Store auth token and user data
        await AsyncStorage.setItem('authToken', response.data.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.user));
        
        // Navigate to instructor dashboard
        navigation.replace('InstructorMain');
      } else {
        Alert.alert('Login Failed', response.data.message || 'Invalid credentials');
      }
    } catch (error) {
      const details = buildErrorDetails(error, 'Login');
      Alert.alert(details.title, details.userMessage);
      console.error('Login error details:', {
        code: error && error.code,
        message: error && error.message,
        baseURL: (error && error.config && error.config.baseURL) || api.defaults.baseURL,
        endpoint: error && error.config && error.config.url,
        status: error && error.response && error.response.status,
        response: error && error.response && error.response.data,
      });
    } finally {
      setLoading(false);
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
          {/* Header Section */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/Automated-Classroom-Attendance-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.universityText}>Automated Classroom Attendance</Text>
            <Text style={styles.subtitleText}>QR Code Monitoring System</Text>
          </View>

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <View style={styles.portalHeader}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <Text style={styles.portalText}>SECURE INSTRUCTOR PORTAL</Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="instructor@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
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
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
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

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login as Instructor</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register here</Text>
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
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  universityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  systemText: {
    fontSize: 13,
    color: COLORS.white,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 11,
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
  },
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  portalText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
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
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    marginLeft: 8,
  },
});
