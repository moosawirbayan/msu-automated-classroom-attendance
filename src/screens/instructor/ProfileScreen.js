import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [instructorData, setInstructorData] = useState({
    name: 'Loading...',
    email: '',
    department: '',
    employee_id: '',
    created_at: '',
  });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    employee_id: '',
  });

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // ── Per-field error messages ──
  const [passwordErrors, setPasswordErrors] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ── About section toggle ──
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // ─────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.get('/profile/index.php', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setInstructorData(response.data.data);
      }
    } catch (error) {
      console.warn('Profile fetch error:', error);
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setInstructorData(JSON.parse(userData));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ─────────────────────────────────────────────
  const openEditModal = () => {
    setEditForm({
      name: instructorData.name,
      department: instructorData.department,
      employee_id: instructorData.employee_id,
    });
    setEditModalVisible(true);
  };

  const handleEditProfile = async () => {
    if (!editForm.name || !editForm.department) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.put('/profile/index.php', editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditModalVisible(false);
        fetchProfile();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.warn('Update profile error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  // ─────────────────────────────────────────────
  const resetPasswordModal = () => {
    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    setPasswordErrors({ current_password: '', new_password: '', confirm_password: '' });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setSavingPassword(false);
  };

  // ─────────────────────────────────────────────
  const validatePasswordForm = () => {
    const errors = { current_password: '', new_password: '', confirm_password: '' };
    let valid = true;

    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required.';
      valid = false;
    }
    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required.';
      valid = false;
    } else if (passwordForm.new_password.length < 6) {
      errors.new_password = 'Password must be at least 6 characters.';
      valid = false;
    }
    if (!passwordForm.confirm_password) {
      errors.confirm_password = 'Please confirm your new password.';
      valid = false;
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
      valid = false;
    }

    setPasswordErrors(errors);
    return valid;
  };

  // ─────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPasswordErrors({ current_password: '', new_password: '', confirm_password: '' });
    if (!validatePasswordForm()) return;

    setSavingPassword(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.put(
        '/profile/index.php',
        {
          current_password: passwordForm.current_password,
          password: passwordForm.new_password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setPasswordModalVisible(false);
        resetPasswordModal();
        Alert.alert('Success', 'Password changed successfully!');
      } else {
        const msg = (response.data.message || '').toLowerCase();
        const isWrongPassword =
          msg.includes('incorrect') || msg.includes('wrong') ||
          msg.includes('invalid') || msg.includes('current password') ||
          msg.includes('does not match') || msg.includes('mismatch');

        if (isWrongPassword) {
          setPasswordErrors((prev) => ({
            ...prev,
            current_password: 'Incorrect current password. Please try again.',
          }));
        } else {
          Alert.alert('Error', response.data.message || 'Failed to change password.');
        }
      }
    } catch (error) {
      const serverMsg = (error?.response?.data?.message || '').toLowerCase();
      const httpStatus = error?.response?.status;
      const isWrongPassword =
        httpStatus === 401 ||
        serverMsg.includes('incorrect') || serverMsg.includes('wrong') ||
        serverMsg.includes('invalid') || serverMsg.includes('current password') ||
        serverMsg.includes('does not match') || serverMsg.includes('mismatch');

      if (isWrongPassword) {
        setPasswordErrors((prev) => ({
          ...prev,
          current_password: 'Incorrect current password. Please try again.',
        }));
      } else {
        console.warn('Change password error:', error);
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // ─────────────────────────────────────────────
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userData');
          navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileInitials}>{getInitials(instructorData.name)}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{instructorData.name}</Text>
        <Text style={styles.profileEmail}>{instructorData.email}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Personal Information ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoItem icon="briefcase-outline" label="Department" value={instructorData.department || 'Not set'} />
          <InfoItem icon="card-outline" label="Employee ID" value={instructorData.employee_id || 'Not set'} />
          <InfoItem icon="mail-outline" label="Email" value={instructorData.email || 'Not set'} />
          <InfoItem
            icon="calendar-outline"
            label="Member Since"
            value={instructorData.created_at ? new Date(instructorData.created_at).toLocaleDateString() : 'N/A'}
          />
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <MenuButton icon="person-outline" label="Edit Profile" onPress={openEditModal} />
          <MenuButton
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => {
              resetPasswordModal();
              setPasswordModalVisible(true);
            }}
          />
        </View>

        {/* ── About ── */}
        <View style={styles.section}>
          {/* Tappable header row with toggle icon */}
          <TouchableOpacity
            style={styles.aboutHeader}
            onPress={() => setAboutExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <View style={styles.aboutHeaderLeft}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Ionicons
              name={aboutExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.gray}
            />
          </TouchableOpacity>

          {/* Collapsible content */}
          {aboutExpanded && (
            <>
              {/* App icon + name */}
              <View style={styles.aboutAppRow}>
                <View style={styles.aboutAppIcon}>
                  <Ionicons name="qr-code" size={36} color={COLORS.primary} />
                </View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={styles.aboutAppName}>Automated Classroom Attendance</Text>
                  <Text style={styles.aboutAppVersion}>Version 1.0.0</Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.aboutDescBox}>
                <Ionicons name="information-circle" size={18} color={COLORS.info || COLORS.primary} style={{ marginTop: 1 }} />
                <Text style={styles.aboutDescText}>
                  This system is designed to automate classroom attendance using QR code scanning
                  technology to improve accuracy and efficiency in academic institutions.
                </Text>
              </View>

              {/* Developed By */}
              <Text style={styles.aboutGroupLabel}>Developed By</Text>
              <Text style={styles.aboutGroupValue}>Mosawir M. Bayan</Text>
              <Text style={styles.aboutGroupValue}>Lykah H. Esmael</Text>

              {/* Technologies Used */}
              <Text style={styles.aboutGroupLabel}>Technologies Used</Text>
              <View style={styles.techRow}>
                <Ionicons name="logo-react" size={16} color="#61DAFB" />
                <Text style={styles.techText}>React Native</Text>
              </View>
              <View style={styles.techRow}>
                <Ionicons name="server-outline" size={16} color="#8892BF" />
                <Text style={styles.techText}>PHP</Text>
              </View>
              <View style={styles.techRow}>
                <Ionicons name="storage-outline" size={16} color="#4479A1" />
                <Text style={styles.techText}>MySQL</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Your Organization</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://yoursite.com/terms')}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}> • </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://yoursite.com/privacy')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════
          EDIT PROFILE MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.gray}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                />
                <Text style={styles.fieldLabel}>Department *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your department"
                  placeholderTextColor={COLORS.gray}
                  value={editForm.department}
                  onChangeText={(text) => setEditForm({ ...editForm, department: text })}
                />
                <Text style={styles.fieldLabel}>Employee ID</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your employee ID"
                  placeholderTextColor={COLORS.gray}
                  value={editForm.employee_id}
                  onChangeText={(text) => setEditForm({ ...editForm, employee_id: text })}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleEditProfile}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════
          CHANGE PASSWORD MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPasswordModalVisible(false);
          resetPasswordModal();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="lock-closed-outline" size={40} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── Current Password ── */}
                <Text style={styles.fieldLabel}>Current Password *</Text>
                <View style={[
                  styles.passwordInputContainer,
                  passwordErrors.current_password ? styles.inputError : null,
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter current password"
                    placeholderTextColor={COLORS.gray}
                    value={passwordForm.current_password}
                    onChangeText={(text) => {
                      setPasswordForm({ ...passwordForm, current_password: text });
                      if (passwordErrors.current_password) {
                        setPasswordErrors((p) => ({ ...p, current_password: '' }));
                      }
                    }}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.gray}
                    />
                  </TouchableOpacity>
                </View>
                {passwordErrors.current_password ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{passwordErrors.current_password}</Text>
                  </View>
                ) : null}

                {/* ── New Password ── */}
                <Text style={styles.fieldLabel}>New Password *</Text>
                <View style={[
                  styles.passwordInputContainer,
                  passwordErrors.new_password ? styles.inputError : null,
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password (min. 6 characters)"
                    placeholderTextColor={COLORS.gray}
                    value={passwordForm.new_password}
                    onChangeText={(text) => {
                      setPasswordForm({ ...passwordForm, new_password: text });
                      if (passwordErrors.new_password) {
                        setPasswordErrors((p) => ({ ...p, new_password: '' }));
                      }
                    }}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.gray}
                    />
                  </TouchableOpacity>
                </View>
                {passwordErrors.new_password ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{passwordErrors.new_password}</Text>
                  </View>
                ) : null}

                {/* ── Confirm New Password ── */}
                <Text style={styles.fieldLabel}>Confirm New Password *</Text>
                <View style={[
                  styles.passwordInputContainer,
                  passwordErrors.confirm_password ? styles.inputError : null,
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter new password"
                    placeholderTextColor={COLORS.gray}
                    value={passwordForm.confirm_password}
                    onChangeText={(text) => {
                      setPasswordForm({ ...passwordForm, confirm_password: text });
                      if (passwordErrors.confirm_password) {
                        setPasswordErrors((p) => ({ ...p, confirm_password: '' }));
                      }
                    }}
                    secureTextEntry={!showConfirmPassword}
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
                {passwordErrors.confirm_password ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{passwordErrors.confirm_password}</Text>
                  </View>
                ) : null}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setPasswordModalVisible(false);
                      resetPasswordModal();
                    }}
                    disabled={savingPassword}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, savingPassword && { opacity: 0.7 }]}
                    onPress={handleChangePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.saveButtonText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIconContainer}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const MenuButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuButton} onPress={onPress}>
    <View style={styles.menuButtonLeft}>
      <Ionicons name={icon} size={22} color={COLORS.textPrimary} />
      <Text style={styles.menuButtonText}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 50, paddingBottom: 30, alignItems: 'center' },
  profileImageContainer: { marginBottom: 16 },
  profileImage: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.white, justifyContent: 'center',
    alignItems: 'center', borderWidth: 3, borderColor: COLORS.secondary,
  },
  profileInitials: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  profileName: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: COLORS.white, opacity: 0.9 },
  content: { flex: 1, padding: 16 },
  section: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 0 },
  infoItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoIconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.grayLight, justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  menuButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuButtonLeft: { flexDirection: 'row', alignItems: 'center' },
  menuButtonText: { fontSize: 15, color: COLORS.textPrimary, marginLeft: 16, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderRadius: 12, paddingVertical: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.error,
  },
  logoutButtonText: { fontSize: 16, fontWeight: 'bold', color: COLORS.error, marginLeft: 12 },

  // ── About section ──
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  aboutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutAppRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, marginBottom: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  aboutAppIcon: {
    width: 64, height: 64, borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  aboutAppName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  aboutAppVersion: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  aboutDescBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe',
  },
  aboutDescText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  aboutGroupLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.textPrimary,
    marginTop: 10, marginBottom: 6,
  },
  aboutGroupValue: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  techText: { fontSize: 14, color: COLORS.textSecondary },

  // ── Footer ──
  footer: { alignItems: 'center', marginBottom: 8, paddingTop: 4 },
  footerText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  footerLinks: { flexDirection: 'row', alignItems: 'center' },
  footerLink: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  footerDot: { fontSize: 12, color: COLORS.textSecondary },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  modalContent: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24,
    width: '90%', maxWidth: 400, maxHeight: '85%',
    elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginTop: 8 },
  modalInput: {
    backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 14,
    marginBottom: 12, fontSize: 16, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  passwordInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.grayLight, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 4, paddingHorizontal: 14,
  },
  inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: COLORS.textPrimary },
  eyeIcon: { padding: 4 },
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, marginTop: 2, paddingHorizontal: 4,
  },
  errorText: { fontSize: 12, color: COLORS.error, marginLeft: 4, fontWeight: '500', flex: 1 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.grayLight, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textSecondary },
  saveButton: { backgroundColor: COLORS.primary },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: COLORS.white },
});