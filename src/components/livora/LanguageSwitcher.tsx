import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

export default function LanguageSwitcher({ isLoggedIn = false, transparentTop = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language || 'en';

  const toggle = async () => {
    const next = current === 'en' ? 'id' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);

    if (isLoggedIn) {
      try {
        await api.patch('/user/language', { language: next });
      } catch (err) {
        console.error('Gagal simpan preferensi bahasa:', err);
      }
    }
  };

  return (
    <button
      onClick={toggle}
      title={current === 'en' ? 'Ganti ke Indonesia' : 'Switch to English'}
      style={{
        fontSize: '20px',
        background: 'transparent',
        border: 'none',
        padding: '4px 6px',
        cursor: 'pointer',
        lineHeight: 1,
        opacity: transparentTop ? 0.85 : 1,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = transparentTop ? '0.85' : '1'}
    >
      {current === 'en' ? '🇬🇧' : '🇮🇩'}
    </button>
  );
}