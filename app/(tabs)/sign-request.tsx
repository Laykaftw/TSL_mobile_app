import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FileText } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '@/utils/theme';

export default function SignRequest() {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    // Handle form submission logic here
    console.log({ name, email, message });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <FileText size={32} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Sign Request</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                }
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Message</Text>
            <TextInput
              style={[
                styles.input,
                styles.messageInput,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                }
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter your message"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }, shadows.medium]}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Submit Request</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.l,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.l,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    marginLeft: spacing.m,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.l,
  },
  label: {
    fontSize: typography.fontSizes.m,
    marginBottom: spacing.s,
    fontFamily: typography.fontFamily.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.medium,
    padding: spacing.m,
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.regular,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginTop: spacing.l,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.medium,
  },
});