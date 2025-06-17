import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Define supported languages
export type Language = 'en' | 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Default language
const DEFAULT_LANGUAGE: Language = 'en';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isRTL, setIsRTL] = useState(false);

  // Load saved language preference
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('userLanguage');
        if (savedLanguage) {
          setLanguageState(savedLanguage as Language);
          updateRTL(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    loadLanguage();
  }, []);

  // Update RTL based on language
  const updateRTL = (lang: Language) => {
    const newIsRTL = lang === 'ar';
    if (I18nManager.isRTL !== newIsRTL) {
      I18nManager.allowRTL(newIsRTL);
      I18nManager.forceRTL(newIsRTL);
      setIsRTL(newIsRTL);
    }
  };

  // Set language and save preference
  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('userLanguage', lang);
      setLanguageState(lang);
      updateRTL(lang);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || translations[DEFAULT_LANGUAGE][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translations object
const translations = {
  en: {
    // Common
    'app.name': 'Sign Language Translator',
    'app.welcome': 'Welcome',
    'app.settings': 'Settings',
    'app.language': 'Language',
    'app.request': 'Request',
    'app.challenge': 'Challenge',
    'app.dictionary': 'Dictionary',
    'app.close': 'Close',
    'app.speakArabic': 'Speak Arabic',
    'app.speakFrench': 'Speak French',
    
    // Video Upload
    'video.record': 'Record Video',
    'video.upload': 'Upload Video',
    'video.processing': 'Processing...',
    'video.error': 'Error processing video',
    'video.success': 'Video processed successfully',
    
    // Settings
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.darkMode': 'Dark Mode',
    'settings.lightMode': 'Light Mode',
    
    // Languages
    'language.english': 'English',
    'language.french': 'French',
    'language.arabic': 'Arabic',
  },
  fr: {
    // Common
    'app.name': 'Traducteur de Langue des Signes',
    'app.welcome': 'Bienvenue',
    'app.settings': 'Paramètres',
    'app.language': 'Langue',
    'app.request': 'Demande',
    'app.challenge': 'Défi',
    'app.dictionary': 'Dictionnaire',
    'app.close': 'Fermer',
    'app.speakArabic': 'Parler en Arabe',
    'app.speakFrench': 'Parler en Français',
    
    // Video Upload
    'video.record': 'Enregistrer une Vidéo',
    'video.upload': 'Télécharger une Vidéo',
    'video.processing': 'Traitement en cours...',
    'video.error': 'Erreur de traitement de la vidéo',
    'video.success': 'Vidéo traitée avec succès',
    
    // Settings
    'settings.language': 'Langue',
    'settings.theme': 'Thème',
    'settings.notifications': 'Notifications',
    'settings.darkMode': 'Mode Sombre',
    'settings.lightMode': 'Mode Clair',
    
    // Languages
    'language.english': 'Anglais',
    'language.french': 'Français',
    'language.arabic': 'Arabe',
  },
  ar: {
    // Common
    'app.name': 'مترجم لغة الإشارة',
    'app.welcome': 'مرحباً',
    'app.settings': 'الإعدادات',
    'app.language': 'اللغة',
    'app.request': 'طلب',
    'app.challenge': 'تحدي',
    'app.dictionary': 'قاموس',
    'app.close': 'إغلاق',
    'app.speakArabic': 'تكلم بالعربية',
    'app.speakFrench': 'تكلم بالفرنسية',
    
    // Video Upload
    'video.record': 'تسجيل فيديو',
    'video.upload': 'رفع فيديو',
    'video.processing': 'جاري المعالجة...',
    'video.error': 'خطأ في معالجة الفيديو',
    'video.success': 'تمت معالجة الفيديو بنجاح',
    
    // Settings
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.notifications': 'الإشعارات',
    'settings.darkMode': 'الوضع الداكن',
    'settings.lightMode': 'الوضع الفاتح',
    
    // Languages
    'language.english': 'الإنجليزية',
    'language.french': 'الفرنسية',
    'language.arabic': 'العربية',
  },
}; 