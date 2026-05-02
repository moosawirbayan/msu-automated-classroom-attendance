import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator, Image,
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
      console.warn('Reset password error:', error);
      if (error?.response?.data?.message) {
        Alert.alert('Reset Password Failed', error.response.data.message);
      } else if (error?.request) {
        Alert.alert('Connection Error', 'Cannot reach the server. Please check your connection.');
      } else {
        Alert.alert('Error', error?.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
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
        password,
      });
      if (response.data.success) {
        await AsyncStorage.setItem('authToken', response.data.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.user));
        navigation.replace('InstructorMain');
      } else {
        Alert.alert('Login Failed', 'Invalid password or email. Please try again.');
      }
    } catch (error) {
      console.warn('Login error:', error);
      if (error?.response?.data?.message) {
        Alert.alert('Login Failed', 'Invalid password or email. Please try again.');
      } else if (error?.response) {
        Alert.alert('Login Failed', 'Invalid password or email. Please try again.');
      } else if (error?.request) {
        Alert.alert('Connection Error', 'Cannot reach the server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error?.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/Automated-Classroom-Attendance-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.universityText}>Automated Classroom Attendance</Text>
            <Text style={styles.subtitleText}>QR Code Monitoring System</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.portalHeader}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <Text style={styles.portalText}>SECURE INSTRUCTOR PORTAL</Text>
            </View>

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
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

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

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register here</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 100, height: 100, marginBottom: 15 },
  universityText: { fontSize: 16, fontWeight: 'bold', color: COLORS.white, marginBottom: 5 },
  subtitleText: { fontSize: 11, color: COLORS.white, opacity: 0.9 },
  formCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24,
    elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  portalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  portalText: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginLeft: 8 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, backgroundColor: COLORS.grayLight, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: COLORS.textPrimary },
  eyeIcon: { padding: 4 },
  loginButton: {
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  forgotPassword: { alignItems: 'center', marginTop: 16 },
  forgotPasswordText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  registerText: { color: COLORS.textSecondary, fontSize: 14 },
  registerLink: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  backButtonText: { color: COLORS.white, fontSize: 14, marginLeft: 8 },
});