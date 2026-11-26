import { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { getCatalogItemLayouts, saveCatalogItemLayouts } from "@/lib/catalogApi";

interface HotspotItem {
  id?: string | number;
  label: string;
  item_slug?: string;
  image?: string;
}

interface ApiItem {
  slug: string;
  title: string;
  image?: string | null;
  cover_image?: string | null;
}

interface Props {
  catalogId: string;
  hotspots: HotspotItem[];
}

const COLS = 4;
const ROW_HEIGHT = 90;

export function ItemsGridEditor({ catalogId, hotspots }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(800);
  const [layout, setLayout] = useState<Layout>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [itemsBySlug, setItemsBySlug] = useState<Record<string, ApiItem>>({});

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setGridWidth(Math.max(520, Math.floor(el.clientWidth - 16)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return hotspots.filter((h) => {
      if (!h.item_slug || seen.has(h.item_slug)) return false;
      seen.add(h.item_slug);
      return true;
    });
  }, [hotspots]);

  useEffect(() => {
    api
      .get<any>("/items")
      .then(({ data }) => {
        const list: ApiItem[] = Array.isArray(data) ? data : data.data ?? [];
        const map: Record<string, ApiItem> = {};
        list.forEach((it) => {
          map[it.slug] = {
            slug: it.slug,
            title: it.title,
            image: it.image ?? it.cover_image ?? null,
          };
        });
        setItemsBySlug(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (uniqueItems.length === 0) {
      setLoaded(true);
      return;
    }

    const load = async () => {
      try {
        const saved = await getCatalogItemLayouts(catalogId);
        const savedMap = new Map(saved.map((l) => [l.item_slug, l]));

        const next: Layout = uniqueItems.map((item, i) => {
          const s = item.item_slug ? savedMap.get(item.item_slug) : undefined;
          return {
            i: item.item_slug!,
            x: s?.pos_x ?? i % COLS,
            y: s?.pos_y ?? Math.floor(i / COLS),
            w: s?.width ?? 1,
            h: s?.height ?? 1,
            minH: 1,
            maxH: 8,
            minW: 1,
            maxW: COLS,
          };
        });
        setLayout(next);
      } catch {
        setLayout(
          uniqueItems.map((item, i) => ({
            i: item.item_slug!,
            x: i % COLS,
            y: Math.floor(i / COLS),
            w: 1,
            h: 1,
          })),
        );
      } finally {
        setLoaded(true);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueItems.map((i) => i.item_slug).join(","), catalogId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCatalogItemLayouts(
        catalogId,
        layout.map((l) => ({
          item_slug: l.i,
          pos_x: l.x,
          pos_y: l.y,
          width: l.w,
          height: l.h,
        })),
      );
      toast.success("Susunan grid produk tersimpan");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan susunan grid");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-sm text-[#656B73]">Memuat susunan grid…</p>;

  if (uniqueItems.length === 0) {
    return (
      <p className="text-sm text-[#656B73]">
        Belum ada titik hotspot yang dihubungkan ke produk furnitur pada scene mana pun.
      </p>
    );
  }

  const hotspotBySlug = new Map(uniqueItems.map((i) => [i.item_slug, i]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-header text-lg text-[#232528]">Susunan Grid "Produk di Ruangan Ini"</h3>
          <p className="mt-0.5 text-xs text-[#656B73]">
            Geser kartu untuk mengatur posisi, tarik sudut kanan-bawah untuk mengubah ukuran kartu di halaman publik.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan Susunan Grid"}
        </button>
      </div>

      <div ref={wrapRef} className="overflow-x-auto rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-2">
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={gridWidth}
          onLayoutChange={(next) => setLayout(next)}
          compactType={null}
          preventCollision={true}
        >
          {layout.map((l) => {
            const hotspot = hotspotBySlug.get(l.i);
            const itemDetail = itemsBySlug[l.i];
            const label = hotspot?.label || itemDetail?.title || l.i;
            const imageSrc = itemDetail?.image;

            return (
              <div
                key={l.i}
                className="flex flex-col overflow-hidden rounded-lg border border-[#E2DACF] bg-white shadow-sm"
              >
                <div className="flex flex-1 items-center justify-center bg-[#FAF8F4] p-2">
                  {imageSrc ? (
                    <img src={imgUrl(imageSrc)} alt={label} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-[#656B73]">Tanpa foto</span>
                  )}
                </div>
                <p className="truncate border-t border-[#F0EAE0] px-2.5 py-1.5 text-[11px] font-medium text-[#232528]">
                  {label}
                </p>
              </div>
            );
          })}
        </GridLayout>
      </div>
    </div>
  );
}
