// i18n configuration
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { preferencesStorage } from './storage'
import { getCookie, setCookie } from './cookie'

// Import translation files
const enTranslations = require('./locales/en.json')
const hiTranslations = require('./locales/hi.json')
const bnTranslations = require('./locales/bn.json')
const taTranslations = require('./locales/ta.json')
const teTranslations = require('./locales/te.json')
const mrTranslations = require('./locales/mr.json')

const resources = {
  en: { translation: enTranslations },
  hi: { translation: hiTranslations },
  bn: { translation: bnTranslations },
  ta: { translation: taTranslations },
  te: { translation: teTranslations },
  mr: { translation: mrTranslations },
}

// Get saved language preference (SSR-aware)
const getSavedLanguage = (): string => {
  // SSR: always default to 'en' (will be updated on client)
  if (typeof window === 'undefined') {
    return 'en'
  }
  // Client: check cookie first (faster, available immediately)
  const cookieLang = getCookie('language')
  if (cookieLang) return cookieLang
  // Then check localStorage
  try {
    const prefs = preferencesStorage.get()
    if (prefs.language) return prefs.language
  } catch {
    // Ignore errors
  }
  return 'en'
}

// Initialize i18n
if (!i18n.isInitialized) {
  const initialLang = getSavedLanguage()
  
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
      },
      debug: false,
    })

  // On client-side, double-check and update language if needed (after init)
  if (typeof window !== 'undefined') {
    // Check again after initialization (in case storage wasn't available during init)
    const cookieLang = getCookie('language')
    if (cookieLang && i18n.language !== cookieLang) {
      i18n.changeLanguage(cookieLang)
    } else {
      try {
        const prefs = preferencesStorage.get()
        const savedLang = prefs.language
        if (savedLang && i18n.language !== savedLang) {
          i18n.changeLanguage(savedLang)
        }
      } catch {
        // Ignore errors
      }
    }
  }

  // Save language preference when changed (cookie + local storage)
  i18n.on('languageChanged', (lng) => {
    setCookie('language', lng)
    if (typeof window !== 'undefined') {
      try {
        preferencesStorage.save({ language: lng })
      } catch (error) {
        console.error('Failed to save language preference:', error)
      }
    }
  })
}

export default i18n

