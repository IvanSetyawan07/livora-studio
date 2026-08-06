import { useEffect, useMemo, useState } from "react";
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
const GRID_WIDTH = 800;

export function ItemsGridEditor({ catalogId, hotspots }: Props) {
  const [layout, setLayout] = useState<Layout>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [itemsBySlug, setItemsBySlug] = useState<Record<string, ApiItem>>({});

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return hotspots.filter((h) => {
      if (!h.item_slug || seen.has(h.item_slug)) return false;
      seen.add(h.item_slug);
      return true;
    });
  }, [hotspots]);

  // ── Fetch daftar item (untuk ambil foto produk asli)
  useEffect(() => {
    api.get<any>("/items").then(({ data }) => {
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
    }).catch(() => {});
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
          }))
        );
      } finally {
        setLoaded(true);
      }
    };

    load();
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
        }))
      );
      toast.success("Layout tersimpan");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gagal menyimpan layout";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Memuat layout…</p>;
  }

  if (uniqueItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada item dengan produk terhubung di scene manapun.
      </p>
    );
  }

  const hotspotBySlug = new Map(uniqueItems.map((i) => [i.item_slug, i]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Susun Grid "Items in this Collection"
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Drag untuk pindah posisi, tarik sudut kanan-bawah untuk resize.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-xs uppercase tracking-[0.15em] bg-foreground text-background px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan Layout"}
        </button>
      </div>

      <div className="border border-border rounded-lg bg-secondary/20 p-2 overflow-x-auto">
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={GRID_WIDTH}
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
                className="bg-background border border-border rounded overflow-hidden flex flex-col"
              >
                <div className="flex-1 flex items-center justify-center bg-secondary p-2">
                  {imageSrc ? (
                    <img
                      src={imgUrl(imageSrc)}
                      alt={label}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                      No image
                    </span>
                  )}
                </div>
                <p className="text-[10px] px-2 py-1 truncate border-t border-border">
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