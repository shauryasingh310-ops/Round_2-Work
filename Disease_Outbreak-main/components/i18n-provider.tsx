"use client"

import { I18nextProvider } from "react-i18next"
import i18n from "@/lib/i18n"
import { preferencesStorage } from "@/lib/storage"
import { getCookie } from "@/lib/cookie"

import { useEffect, useState, useLayoutEffect } from "react"

export function I18nProvider({ children, lang }: { children: React.ReactNode, lang?: string }) {
  const [currentLang, setCurrentLang] = useState(() => {
    // Initialize with current i18n language
    if (typeof window !== 'undefined') {
      // On client, try to get saved language immediately
      const cookieLang = getCookie('language')
      if (cookieLang) return cookieLang
      try {
        const prefs = preferencesStorage.get()
        if (prefs.language) return prefs.language
      } catch {}
    }
    return i18n.language
  })

  // Use useLayoutEffect to load language synchronously before paint
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const loadLanguage = async () => {
      try {
        let targetLang: string | null = null

        // If lang prop is provided, use it (takes priority)
        if (lang && i18n.language !== lang) {
          targetLang = lang
        } else if (!lang) {
          // First check cookie (faster, available immediately)
          const cookieLang = getCookie('language')
          if (cookieLang && i18n.language !== cookieLang) {
            targetLang = cookieLang
          } else {
            // Then check localStorage
            const prefs = preferencesStorage.get()
            const savedLang = prefs.language
            if (savedLang && i18n.language !== savedLang) {
              targetLang = savedLang
            }
          }
        }

        // Change language if needed
        if (targetLang) {
          await i18n.changeLanguage(targetLang)
          setCurrentLang(targetLang)
        }
      } catch (error) {
        console.error('Failed to load language preference:', error)
      }
    }

    loadLanguage()
  }, [lang]) // Only depend on lang prop, not currentLang to avoid loops

  // Listen for language changes from i18n
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (lng !== currentLang) {
        setCurrentLang(lng)
      }
    }

    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [currentLang])

  // Use key prop to force re-render when language changes
  return (
    <I18nextProvider i18n={i18n} key={currentLang}>
      {children}
    </I18nextProvider>
  )
}

