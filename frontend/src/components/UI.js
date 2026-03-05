import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';

const colors = {
  primary: '#2563eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  bg: '#f8fafc',
  border: '#e2e8f0',
  text: '#1e293b'
};

// Toast/Banner component
export function Toast({ message, type = 'info', visible = true, onDismiss }) {
  if (!visible) return null;

  const bgColor = {
    success: '#d1fae5',
    error: '#fee2e2',
    warning: '#fef3c7',
    info: '#dbeafe'
  }[type] || '#dbeafe';

  const textColor = {
    success: '#065f46',
    error: '#7f1d1d',
    warning: '#78350f',
    info: '#0c4a6e'
  }[type] || '#0c4a6e';

  return (
    <View style={[styles.toast, { backgroundColor: bgColor }]}>
      <Text style={[styles.toastText, { color: textColor }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <Text style={{ color: textColor, fontSize: 18 }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Modal component
export function ConfirmModal({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirm' }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onCancel}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={onConfirm}
            >
              <Text style={styles.buttonPrimaryText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Button component
export function Button({ onPress, title, loading = false, disabled = false, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && styles.buttonDisabled
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.primary} />
      ) : (
        <Text style={isPrimary ? styles.buttonPrimaryText : styles.buttonSecondaryText}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Card component
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Input component
export function TextInput({ placeholder, value, onChangeText, secureTextEntry = false, style }) {
  return (
    <React.NativeBase.TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      placeholderTextColor="#94a3b8"
    />
  );
}

// Loading spinner
export function LoadingSpinner() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

// Empty state
export function EmptyState({ message, icon = '📭' }) {
  return (
    <View style={styles.emptyState}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>{icon}</Text>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

// Error banner
export function ErrorBanner({ message }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    flex: 1
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  buttonSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    height: 44
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: 12,
    marginBottom: 12
  },
  errorBannerText: {
    color: '#7f1d1d',
    fontSize: 14
  }
});

export default { Toast, ConfirmModal, Button, Card, LoadingSpinner, EmptyState, ErrorBanner };
