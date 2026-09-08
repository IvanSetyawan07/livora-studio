import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export type TranslatableType =
  | 'item'
  | 'collection'
  | 'catalog'
  | 'project'
  | 'theme'
  | 'category'
  | 'furniture-type';

type Payload = {
  fields: string[];
  base: Record<string, string | null>;
  translations: { id: Record<string, string>; en: Record<string, string> };
};

const LABELS: Record<string, { id: string; en: string }> = {
  title: { id: 'Judul', en: 'Title' },
  name: { id: 'Nama', en: 'Name' },
  subtitle: { id: 'Subjudul', en: 'Subtitle' },
  tagline: { id: 'Tagline', en: 'Tagline' },
  about_title: { id: 'Judul "Tentang"', en: 'About title' },
  description: { id: 'Deskripsi', en: 'Description' },
  short_description: { id: 'Deskripsi singkat', en: 'Short description' },
  texture: { id: 'Tekstur', en: 'Texture' },
  finish: { id: 'Finishing', en: 'Finish' },
  material_detail: { id: 'Detail material', en: 'Material detail' },
  location: { id: 'Lokasi', en: 'Location' },
  seo_title: { id: 'Judul SEO', en: 'SEO title' },
  seo_description: { id: 'Deskripsi SEO', en: 'SEO description' },
  cta_text: { id: 'Teks tombol', en: 'CTA text' },
};

const LONG_FIELDS = ['description', 'short_description', 'seo_description', 'material_detail'];

/**
 * Panel dwibahasa untuk satu record konten.
 *
 * Admin cukup mengisi satu bahasa di form utama; di sini dia melengkapi
 * bahasa lainnya, atau menekan "Terjemahkan otomatis" lalu mengoreksi hasilnya
 * sebelum menyimpan. Hasil AI tidak langsung tersimpan sebelum ditekan Simpan.
 */
export default function TranslationPanel({
  type,
  id,
  className = '',
}: {
  type: TranslatableType;
  id: number | string | null | undefined;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const uiId = (i18n.language || 'en').startsWith('id');
  const L = (idText: string, enText: string) => (uiId ? idText : enText);

  const [locale, setLocale] = useState<'id' | 'en'>('id');
  const [data, setData] = useState<Payload | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get(`/admin/translations/${type}/${id}`)
      .then((r) => {
        if (!alive) return;
        const payload = r.data as Payload;
        setData(payload);
        setValues({ ...(payload.translations[locale] || {}) });
      })
      .catch(() => alive && setError(L('Gagal memuat data terjemahan.', 'Failed to load translations.')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const switchLocale = (next: 'id' | 'en') => {
    if (!data) return;
    setLocale(next);
    setValues({ ...(data.translations[next] || {}) });
  };

  const autoTranslate = async () => {
    if (!id) return;
    setTranslating(true);
    try {
      const from = locale === 'id' ? 'en' : 'id';
      const r = await api.post(`/admin/translations/${type}/${id}/auto`, { from, to: locale });
      setValues((prev) => ({ ...prev, ...(r.data.values as Record<string, string>) }));
      toast.success(
        L('Terjemahan dibuat. Periksa dulu, lalu tekan Simpan.', 'Draft translated. Review it, then press Save.'),
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        L('Terjemahan otomatis gagal.', 'Auto-translation failed.');
      toast.error(msg);
    } finally {
      setTranslating(false);
    }
  };

  const save = async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      await api.post(`/admin/translations/${type}/${id}`, { locale, values });
      setData({ ...data, translations: { ...data.translations, [locale]: { ...values } } });
      toast.success(L('Terjemahan tersimpan.', 'Translations saved.'));
    } catch {
      toast.error(L('Gagal menyimpan terjemahan.', 'Failed to save translations.'));
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className={`rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground ${className}`}>
        {L('Simpan dulu kontennya, lalu versi bahasa keduanya bisa diisi di sini.',
           'Save the content first, then its second language can be filled in here.')}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{L('Versi bahasa', 'Language versions')}</h3>
          <p className="text-xs text-muted-foreground">
            {L('Kosongkan kalau ingin memakai teks aslinya.', 'Leave blank to keep the original text.')}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border p-1">
          {(['id', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => switchLocale(code)}
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide transition-colors ${
                locale === code ? 'bg-foreground text-background' : 'text-foreground/70 hover:bg-muted'
              }`}
            >
              {code === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">{L('Memuat…', 'Loading…')}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <div className="space-y-3">
            {data.fields.map((field) => {
              const label = LABELS[field]?.[uiId ? 'id' : 'en'] ?? field;
              const base = data.base[field];
              const long = LONG_FIELDS.includes(field);
              return (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium">{label}</label>
                  {base ? (
                    <p className="mb-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {L('Asli: ', 'Original: ')}
                      {base}
                    </p>
                  ) : null}
                  {long ? (
                    <textarea
                      rows={4}
                      value={values[field] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                    />
                  ) : (
                    <input
                      value={values[field] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={autoTranslate}
              disabled={translating}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {translating
                ? L('Menerjemahkan…', 'Translating…')
                : L('Terjemahkan otomatis dengan AI', 'Auto-translate with AI')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
            >
              {saving ? L('Menyimpan…', 'Saving…') : L('Simpan terjemahan', 'Save translations')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
