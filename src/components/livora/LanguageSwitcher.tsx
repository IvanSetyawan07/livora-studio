import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

const LANGS = [
  { code: 'id', flag: '🇮🇩', label: 'Indonesia' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
] as const;

export default function LanguageSwitcher({
  isLoggedIn = false,
  transparentTop = false,
  variant = 'toggle',
}: {
  isLoggedIn?: boolean;
  transparentTop?: boolean;
  variant?: 'toggle' | 'segmented';
}) {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'en').startsWith('id') ? 'id' : 'en';

  const setLang = async (next: string) => {
    if (next === current) return;
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

  if (variant === 'segmented') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-border p-1">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            title={l.label}
            aria-label={l.label}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
              current === l.code
                ? 'bg-foreground text-background'
                : 'text-foreground/70 hover:bg-muted'
            }`}
          >
            <span className="text-sm leading-none">{l.flag}</span>
            <span className="uppercase tracking-[0.12em]">{l.code}</span>
          </button>
        ))}
      </div>
    );
  }

  const next = current === 'en' ? 'id' : 'en';
  const currentLang = LANGS.find((l) => l.code === current)!;

  return (
    <button
      onClick={() => setLang(next)}
      title={current === 'en' ? 'Ganti ke Indonesia' : 'Switch to English'}
      aria-label={currentLang.label}
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
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = transparentTop ? '0.85' : '1')}
    >
      {currentLang.flag}
    </button>
  );
}
