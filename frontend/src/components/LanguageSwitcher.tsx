import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const setLang = (lang: 'en' | 'my') => {
    i18n.changeLanguage(lang)
    localStorage.setItem('pos_lang', lang)
  }

  return (
    <div className="lang-switcher">
      <button type="button" onClick={() => setLang('en')} className={i18n.language === 'en' ? 'active' : ''}>
        EN
      </button>
      <button type="button" onClick={() => setLang('my')} className={i18n.language === 'my' ? 'active' : ''}>
        မြန်မာ
      </button>
    </div>
  )
}
