import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { typography, spacing, borderRadius } from '@/utils/theme';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', label: t('language.english') },
    { code: 'fr', label: t('language.french') },
    { code: 'ar', label: t('language.arabic') },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language')}</Text>
      <View style={styles.languageContainer}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageButton,
              language === lang.code && styles.activeLanguage,
            ]}
            onPress={() => setLanguage(lang.code as 'en' | 'fr' | 'ar')}
          >
            <Text
              style={[
                styles.languageText,
                language === lang.code && styles.activeLanguageText,
              ]}
            >
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
  },
  title: {
    fontSize: typography.fontSizes.l,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.m,
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  languageButton: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#ccc',
    minWidth: 100,
    alignItems: 'center',
  },
  activeLanguage: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  languageText: {
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.medium,
    color: '#333',
  },
  activeLanguageText: {
    color: '#fff',
  },
}); 