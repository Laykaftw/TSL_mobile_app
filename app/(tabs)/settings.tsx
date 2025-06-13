import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { typography, spacing, borderRadius, shadows } from '@/utils/theme';
import { Settings, Globe, Moon, Sun, Bell } from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', label: t('language.english') },
    { code: 'fr', label: t('language.french') },
    { code: 'ar', label: t('language.arabic') },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {t('app.settings')}
      </Text>

      {/* Language Section */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Globe size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('settings.language')}
          </Text>
        </View>
        <View style={styles.languageContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                { 
                  backgroundColor: language === lang.code ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
                shadows.small
              ]}
              onPress={() => setLanguage(lang.code as 'en' | 'fr' | 'ar')}
            >
              <Text
                style={[
                  styles.languageText,
                  { 
                    color: language === lang.code ? '#fff' : theme.text,
                    fontFamily: typography.fontFamily.medium,
                  }
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Theme Section */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          {isDarkMode ? (
            <Moon size={24} color={theme.primary} />
          ) : (
            <Sun size={24} color={theme.primary} />
          )}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('settings.theme')}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.themeButton,
            { 
              backgroundColor: isDarkMode ? theme.primary : theme.card,
              borderColor: theme.border,
            },
            shadows.small
          ]}
          onPress={toggleTheme}
        >
          <Text
            style={[
              styles.themeButtonText,
              { 
                color: isDarkMode ? '#fff' : theme.text,
                fontFamily: typography.fontFamily.medium,
              }
            ]}
          >
            {isDarkMode ? t('settings.darkMode') : t('settings.lightMode')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.l,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.l,
  },
  section: {
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.l,
    fontFamily: typography.fontFamily.bold,
    marginLeft: spacing.s,
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  languageButton: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  languageText: {
    fontSize: typography.fontSizes.m,
  },
  themeButton: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: typography.fontSizes.m,
  },
}); 