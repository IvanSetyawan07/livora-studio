import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { useAllItems, type RichItem } from "@/lib/itemsApi";
import { getLocalLandingPreview } from "@/lib/localLandingPreview";
import {
  resolveSwatchHex,
  getVariantDisplayLabel,
} from "@/lib/furnitureColors";
import {
  ensureBannersLoaded,
  getAllBannersList,
  subscribeBanners,
  type ThemeBanner,
} from "@/lib/themeBanners";
import {
  getAllThumbnails,
  subscribeThumbnails,
  type ThemeThumbnail,
} from "@/lib/themeThumbnails";
import {
  DEFAULT_FURNITURE_CATEGORIES,
  categoriesMatch,
  getFallbackCategoryImage,
  getFallbackCategoryMeta,
  getFallbackCategoryTagline,
  lookupCategoryBanners,
  lookupCategoryThumbnail,
} from "@/lib/furnitureCategoryMedia";
import {
  gsap,
  ScrollTrigger,
  registerGsap,
  prefersReducedMotion,
  scheduleScrollTriggerRefresh,
} from "@/lib/motionTokens";

import fallbackHeroImg from "@/assets/_opt/furniture-hompage-800.webp";

type ApiFurnitureType = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
};

type PermanentGalleryCategory = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  imageSm?: string;
  count: number;
};

const getItemHref = (item: RichItem) => {
  if (item.apiId != null && item.apiId < 0) {
    return item.type?.slug
      ? `/furniture?category=${encodeURIComponent(item.type.slug)}`
      : "/furniture";
  }
  return `/items/${item.slug}`;
};

/**
 * Hanna Stína-inspired staggered baseline heights (`items-end`) for Category Plates:
 * Tall Left → Low-Wide Center → Extra-Tall Right.
 * Full-bleed interior room scenes (`object-cover`) just like architectural exhibition prints.
 */
const CATEGORY_ROW1_SLOTS = [
  { colClass: "lg:col-span-4", aspectClass: "aspect-[3/4.1]" },
  { colClass: "lg:col-span-4", aspectClass: "aspect-[4/3.05]" },
  { colClass: "lg:col-span-4", aspectClass: "aspect-[3/4.65]" },
];

const PermanentCategoryPlate = ({
  category,
  index,
  colClass,
  aspectClass,
}: {
  category: PermanentGalleryCategory;
  index: number;
  colClass: string;
  aspectClass: string;
}) => {
  const num = String(index + 1).padStart(2, "0");
  const href = `/furniture?category=${encodeURIComponent(category.slug)}`;

  return (
    <article data-perm-plate className={`group flex flex-col ${colClass}`}>
      {/* Full-Bleed Architectural Category Plate linking straight to /furniture?category=<slug> */}
      <Link
        to={href}
        aria-label={`Explore ${category.name} furniture collection`}
        className={`relative block overflow-hidden bg-[#F1EFEA] ${aspectClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8] transition-shadow duration-500 shadow-[0_1px_0_rgba(35,37,40,0.06)] hover:shadow-[0_28px_64px_-38px_rgba(35,37,40,0.28)]`}
      >
        <img
          src={category.image}
          srcSet={
            category.imageSm
              ? `${category.imageSm} 600w, ${category.image} 1600w`
              : undefined
          }
          sizes="(max-width: 768px) 100vw, 33vw"
          alt={`${category.name} — LIVORA Permanent Gallery`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
        />

        {/* Whisper-light edge wash on hover so badge pops cleanly */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#232528]/28 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        <span className="pointer-events-none absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 bg-[#232528] text-[#FAF8F4] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.26em] opacity-0 translate-y-1.5 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          Explore {category.name} <ArrowUpRight className="h-3 w-3" />
        </span>
      </Link>

      {/* Crisp Hanna Stína Swiss-Editorial Caption Bar: [01] CATEGORY   COUNT / EXPLORE → */}
      <div className="mt-3.5 pt-3 border-t border-[#232528]/12 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] font-mono tracking-[0.12em] text-[#5E93B8] shrink-0">
              [{num}]
            </span>
            <Link
              to={href}
              className="text-xs sm:text-[13px] uppercase tracking-[0.18em] font-medium text-[#232528] hover:text-[#5E93B8] transition-colors line-clamp-1"
            >
              {category.name}
            </Link>
          </div>
          <p className="mt-1 pl-7 text-[11px] font-light text-[#656B73] line-clamp-1">
            {category.tagline}
          </p>
        </div>

        <Link
          to={href}
          className="inline-flex items-center gap-1 shrink-0 pt-0.5 text-[10px] uppercase tracking-[0.2em] text-[#656B73] group-hover:text-[#5E93B8] transition-colors"
        >
          <span>
            {category.count > 0
              ? `${category.count} ${category.count === 1 ? "Piece" : "Pieces"}`
              : "Explore"}
          </span>
          <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
};

export const Furniture = () => {
  const { t } = useTranslation();
  const allItems = useAllItems();

  const sectionRef = useRef<HTMLElement | null>(null);
  const fanStageRef = useRef<HTMLDivElement | null>(null);
  const fanRotorRef = useRef<HTMLDivElement | null>(null);
  const fanRectRef = useRef<DOMRect | null>(null);
  const quickRotYRef = useRef<gsap.QuickToFunc | null>(null);
  const quickRotXRef = useRef<gsap.QuickToFunc | null>(null);
  const quickRotZRef = useRef<gsap.QuickToFunc | null>(null);
  const scrollSpinRef = useRef(-24);
  const autoSpinRef = useRef(0);
  const manualSpinRef = useRef(0);
  const hoverTiltRef = useRef({ rx: -8, rz: 0 });
  const isFanVisibleRef = useRef(true);
  const autoPauseUntilRef = useRef(0);
  const suppressLeafClickRef = useRef(false);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    lastX: 0,
    moved: false,
    velocity: 0,
  });
  const [isDraggingFan, setIsDraggingFan] = useState(false);

  const [apiTypes, setApiTypes] = useState<ApiFurnitureType[]>([]);
  const [bannersStore, setBannersStore] = useState<Record<string, ThemeBanner[]>>(() =>
    getAllBannersList(),
  );
  const [thumbnailsStore, setThumbnailsStore] = useState<Record<string, ThemeThumbnail>>(
    {},
  );

  useEffect(() => {
    let alive = true;
    api
      .get<ApiFurnitureType[]>("/taxonomies/furniture-types")
      .then((res) => {
        if (alive && Array.isArray(res.data)) {
          setApiTypes(res.data);
        }
      })
      .catch(() => {});

    void ensureBannersLoaded().then((store) => {
      if (alive) setBannersStore({ ...store });
    });
    const unsubBanners = subscribeBanners(() => {
      setBannersStore({ ...getAllBannersList() });
    });

    getAllThumbnails()
      .then((thumbs) => {
        if (alive) setThumbnailsStore(thumbs);
      })
      .catch(() => {});
    const unsubThumbs = subscribeThumbnails(() => {
      getAllThumbnails()
        .then((thumbs) => {
          if (alive) setThumbnailsStore(thumbs);
        })
        .catch(() => {});
    });

    return () => {
      alive = false;
      unsubBanners();
      unsubThumbs();
    };
  }, []);

  const { newArrivals, isExplicitNewArrival, isLocalPreview } = useMemo(() => {
    const localPreview = getLocalLandingPreview();
    const flagged = allItems.filter((it) => Boolean(it.is_new_arrival));
    const hasExplicit = flagged.length > 0;

    let arrivals: RichItem[];
    let usedPreview = false;

    if (hasExplicit) {
      arrivals = flagged.slice(0, 6);
    } else if (localPreview?.PREVIEW_NEW_ARRIVALS?.length) {
      arrivals = localPreview.PREVIEW_NEW_ARRIVALS;
      usedPreview = true;
    } else {
      arrivals = allItems.slice(0, 4);
    }

    return {
      newArrivals: arrivals,
      isExplicitNewArrival: hasExplicit || usedPreview,
      isLocalPreview: usedPreview,
    };
  }, [allItems]);

  /**
   * Permanent Gallery displays LIVORA's Furniture Categories / Themes
   * (Sofa, Chair, Table, Bed, Accessories, + any Admin-added Furniture Type).
   * Clicking any plate opens `/furniture?category=<slug>` with its lifestyle banner + filtered items.
   */
  const permanentCategories = useMemo<PermanentGalleryCategory[]>(() => {
    const countItemsForCategory = (slug: string, name: string) =>
      allItems.filter(
        (it) =>
          categoriesMatch(it.type?.slug, slug) ||
          categoriesMatch(it.type?.name, name) ||
          categoriesMatch(it.category, name),
      ).length;

    const sourceList: { slug: string; name: string; apiImage?: string | null }[] =
      apiTypes.length > 0
        ? [...apiTypes]
            .sort((a, b) => {
              const oa = getFallbackCategoryMeta(a.slug || a.name)?.order ?? 99;
              const ob = getFallbackCategoryMeta(b.slug || b.name)?.order ?? 99;
              if (oa !== ob) return oa - ob;
              return a.name.localeCompare(b.name);
            })
            .map((t) => ({ slug: t.slug, name: t.name, apiImage: t.image }))
        : DEFAULT_FURNITURE_CATEGORIES.map((c) => ({
            slug: c.slug,
            name: c.name,
            apiImage: null,
          }));

    return sourceList.map((entry) => {
      const fallbackMeta = getFallbackCategoryMeta(entry.slug || entry.name);
      const thumbImg = lookupCategoryThumbnail(
        thumbnailsStore,
        entry.name,
        entry.slug,
      );
      const bannerImg = lookupCategoryBanners(
        bannersStore,
        entry.name,
        entry.slug,
      )[0]?.image;
      const firstItemImg = allItems.find(
        (it) =>
          (categoriesMatch(it.type?.slug, entry.slug) ||
            categoriesMatch(it.type?.name, entry.name) ||
            categoriesMatch(it.category, entry.name)) &&
          Boolean(it.image),
      )?.image;

      const resolvedImage =
        (entry.apiImage ? imgUrl(entry.apiImage) : null) ||
        thumbImg ||
        bannerImg ||
        fallbackMeta?.image ||
        firstItemImg ||
        getFallbackCategoryImage(entry.name);

      const usedCuratedFallback =
        !entry.apiImage && !thumbImg && !bannerImg && Boolean(fallbackMeta?.imageSm);

      return {
        slug: entry.slug,
        name: entry.name,
        tagline: getFallbackCategoryTagline(entry.name),
        image: resolvedImage,
        imageSm: usedCuratedFallback ? fallbackMeta?.imageSm : undefined,
        count: countItemsForCategory(entry.slug, entry.name),
      };
    });
  }, [apiTypes, allItems, bannersStore, thumbnailsStore]);

  const [activeArrivalIdx, setActiveArrivalIdx] = useState(0);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  useEffect(() => {
    if (activeArrivalIdx >= newArrivals.length) {
      setActiveArrivalIdx(0);
    }
  }, [newArrivals.length, activeArrivalIdx]);

  const activePiece = newArrivals[activeArrivalIdx] ?? newArrivals[0];
  const activeVariants = useMemo(
    () => (activePiece?.variants ?? []).filter((v) => v.is_active !== false),
    [activePiece],
  );

  useEffect(() => {
    const defIdx = activeVariants.findIndex((v) => v.is_default);
    setActiveVariantIdx(defIdx >= 0 ? defIdx : 0);
  }, [activePiece?.slug, activeVariants]);

  const selectedVariant = activeVariants[activeVariantIdx];
  const activeHeroImg =
    selectedVariant?.furniture_image || activePiece?.image || fallbackHeroImg;
  const selectedVariantLabel = getVariantDisplayLabel(selectedVariant);

  /**
   * Build 8 radial 3D Fan leaves radiating from one central spine (just like Hanna Stína 00:06–00:14).
   * Cycles cleanly across the New Arrival pieces + their variant images so the 3D fan is always lush!
   */
  const fanLeaves = useMemo(() => {
    if (!newArrivals.length) return [];
    const targetCount = 8;
    const leaves: {
      key: string;
      pieceIdx: number;
      piece: RichItem;
      img: string;
      angle: number;
    }[] = [];

    for (let i = 0; i < targetCount; i++) {
      const pieceIdx = i % newArrivals.length;
      const piece = newArrivals[pieceIdx];
      const pass = Math.floor(i / newArrivals.length);
      const variants = (piece.variants ?? []).filter((v) => v.is_active !== false);
      let img: string;
      if (pieceIdx === activeArrivalIdx && pass === 0) {
        img = activeHeroImg;
      } else {
        const vImg = variants[pass % Math.max(1, variants.length)]?.furniture_image;
        img = vImg || piece.image || fallbackHeroImg;
      }
      leaves.push({
        key: `${piece.slug}-${i}`,
        pieceIdx,
        piece,
        img,
        angle: (360 / targetCount) * i,
      });
    }
    return leaves;
  }, [newArrivals, activeArrivalIdx, activeHeroImg]);

  const getTotalRotY = () =>
    scrollSpinRef.current + autoSpinRef.current + manualSpinRef.current;

  const applyFanTransform = () => {
    const totalY = getTotalRotY();
    if (quickRotYRef.current && quickRotXRef.current && quickRotZRef.current) {
      quickRotYRef.current(totalY);
      quickRotXRef.current(hoverTiltRef.current.rx);
      quickRotZRef.current(hoverTiltRef.current.rz);
      return;
    }
    const rotor = fanRotorRef.current;
    if (rotor) {
      gsap.set(rotor, {
        rotationY: totalY,
        rotationX: hoverTiltRef.current.rx,
        rotation: hoverTiltRef.current.rz,
      });
    }
  };

  // Mount-once GSAP Effect: Header reveals + 360° Idle Spin + Scroll-Spin + Drag-Ready quickTo
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const rotor = fanRotorRef.current;
    if (rotor) {
      gsap.set(rotor, {
        rotationX: hoverTiltRef.current.rx,
        rotationY: getTotalRotY(),
        rotation: hoverTiltRef.current.rz,
      });
    }

    if (prefersReducedMotion()) return;
    registerGsap();
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelectorAll<HTMLElement>("[data-fur-reveal]"),
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: { trigger: section, start: "top 80%", once: true },
        },
      );

      if (fanStageRef.current && fanRotorRef.current) {
        const targetRotor = fanRotorRef.current;
        // GSAP quickTo requires canonical transform property names (rotationY / rotationX / rotation)
        quickRotYRef.current = gsap.quickTo(targetRotor, "rotationY", {
          duration: 0.45,
          ease: "power3.out",
        });
        quickRotXRef.current = gsap.quickTo(targetRotor, "rotationX", {
          duration: 0.45,
          ease: "power3.out",
        });
        quickRotZRef.current = gsap.quickTo(targetRotor, "rotation", {
          duration: 0.45,
          ease: "power3.out",
        });

        ScrollTrigger.create({
          trigger: fanStageRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => {
            // Smooth full 360° sweep as you scroll past the stage
            scrollSpinRef.current = -24 - self.progress * 360;
            quickRotYRef.current?.(getTotalRotY());
          },
        });
      }
    }, section);

    // Gentle continuous 360° turntable rotation even when not scrolling (pauses off-screen & while dragging)
    const tickAutoSpin = (_time: number, deltaTime: number) => {
      if (!isFanVisibleRef.current) return;
      if (dragRef.current.active) return;
      if (performance.now() < autoPauseUntilRef.current) return;
      const dt = Math.min(deltaTime, 50) / 1000;
      autoSpinRef.current -= dt * 9;
      quickRotYRef.current?.(getTotalRotY());
    };
    gsap.ticker.add(tickAutoSpin);

    let observer: IntersectionObserver | null = null;
    if (fanStageRef.current && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          isFanVisibleRef.current = entry.isIntersecting;
        },
        { threshold: 0.01 },
      );
      observer.observe(fanStageRef.current);
    }

    const onResize = () => {
      fanRectRef.current = null;
    };
    window.addEventListener("resize", onResize, { passive: true });
    scheduleScrollTriggerRefresh();

    return () => {
      gsap.ticker.remove(tickAutoSpin);
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      quickRotYRef.current = null;
      quickRotXRef.current = null;
      quickRotZRef.current = null;
      ctx.revert();
    };
  }, []);

  // Batched Permanent Gallery plate entrance (re-runs only if category count changes)
  useLayoutEffect(() => {
    if (prefersReducedMotion() || typeof window === "undefined") return;
    registerGsap();
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const plates = gsap.utils.toArray<HTMLElement>("[data-perm-plate]", section);
      if (plates.length) {
        gsap.set(plates, { opacity: 0, y: 30 });
        ScrollTrigger.batch(plates, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.85,
              stagger: 0.09,
              ease: "expo.out",
              clearProps: "transform",
            });
          },
        });
      }
    }, section);

    scheduleScrollTriggerRefresh();
    return () => ctx.revert();
  }, [permanentCategories.length]);

  const syncActivePieceFromAngle = (angleY: number) => {
    if (!newArrivals.length) return;
    const normalized = (((-angleY) % 360) + 360) % 360;
    const frontLeafIdx = Math.round(normalized / 45) % 8;
    setActiveArrivalIdx(frontLeafIdx % newArrivals.length);
  };

  // Continuous 360° step for ← / → arrows (never rewinds!)
  const stepArrival = (direction: 1 | -1) => {
    if (!newArrivals.length) return;
    const stepDeg = 360 / Math.max(1, fanLeaves.length || 8);
    setActiveArrivalIdx(
      (prev) => (prev + direction + newArrivals.length) % newArrivals.length,
    );
    manualSpinRef.current -= direction * stepDeg;
    autoPauseUntilRef.current = performance.now() + 1200;
    applyFanTransform();
  };

  // Shortest-arc 360° turn when clicking a specific leaf or bottom index item (never rewinds!)
  const selectArrival = (nextIdx: number, specificLeafAngle?: number) => {
    if (!newArrivals.length) return;
    if (suppressLeafClickRef.current) return;
    const clamped = (nextIdx + newArrivals.length) % newArrivals.length;
    setActiveArrivalIdx(clamped);

    const currentY = getTotalRotY();
    const candidateAngles =
      specificLeafAngle !== undefined
        ? [specificLeafAngle]
        : fanLeaves
            .filter((leaf) => leaf.pieceIdx === clamped)
            .map((leaf) => leaf.angle);

    if (candidateAngles.length > 0) {
      let bestDelta = Infinity;
      for (const angle of candidateAngles) {
        const targetY = -angle;
        const delta = ((((targetY - currentY) % 360) + 540) % 360) - 180;
        if (Math.abs(delta) < Math.abs(bestDelta)) {
          bestDelta = delta;
        }
      }
      if (Number.isFinite(bestDelta)) {
        manualSpinRef.current += bestDelta;
      }
    }

    autoPauseUntilRef.current = performance.now() + 1200;
    applyFanTransform();
  };

  const handleFanPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    fanRectRef.current = e.currentTarget.getBoundingClientRect();
  };

  const handleFanPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    fanRectRef.current = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      moved: false,
      velocity: 0,
    };
    suppressLeafClickRef.current = false;
  };

  const handleFanPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.active && dragRef.current.pointerId === e.pointerId) {
      const dx = e.clientX - dragRef.current.lastX;
      dragRef.current.lastX = e.clientX;
      if (!dragRef.current.moved && Math.abs(e.clientX - dragRef.current.startX) > 5) {
        dragRef.current.moved = true;
        suppressLeafClickRef.current = true;
        setIsDraggingFan(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore if pointer already released
        }
      }
      if (dragRef.current.moved) {
        const deltaDeg = dx * 0.45;
        dragRef.current.velocity = deltaDeg;
        manualSpinRef.current += deltaDeg;
        applyFanTransform();
        return;
      }
    }

    if (prefersReducedMotion()) return;
    const rect =
      fanRectRef.current ??
      (fanRectRef.current = e.currentTarget.getBoundingClientRect());
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    hoverTiltRef.current = {
      rx: -8 - ny * 10,
      rz: nx * 3.5,
    };
    quickRotXRef.current?.(hoverTiltRef.current.rx);
    quickRotZRef.current?.(hoverTiltRef.current.rz);
  };

  const finishFanDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const wasMoved = dragRef.current.moved;
    const vel = dragRef.current.velocity;
    dragRef.current.active = false;
    dragRef.current.pointerId = -1;
    dragRef.current.moved = false;
    dragRef.current.velocity = 0;
    setIsDraggingFan(false);

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (wasMoved) {
      // Smooth inertial glide after releasing drag
      const glide = Math.max(-75, Math.min(75, vel * 6.5));
      manualSpinRef.current += glide;
      autoPauseUntilRef.current = performance.now() + 900;
      applyFanTransform();
      syncActivePieceFromAngle(getTotalRotY());
      window.setTimeout(() => {
        suppressLeafClickRef.current = false;
      }, 60);
    }
  };

  const handleFanPointerLeave = () => {
    if (dragRef.current.active && dragRef.current.moved) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = -1;
    fanRectRef.current = null;
    hoverTiltRef.current = { rx: -8, rz: 0 };
    quickRotXRef.current?.(-8);
    quickRotZRef.current?.(0);
  };

  const row1Categories = permanentCategories.slice(0, 3);
  const row2Categories = permanentCategories.slice(3);

  return (
    <section
      id="furniture"
      ref={sectionRef}
      className="relative overflow-x-clip bg-[#FAF8F4] text-[#232528] py-20 sm:py-24 lg:py-32"
    >
      <div className="container-livora">
        {/* ══════════════════════════════════════════════════════════════
            ACT I — NEW ARRIVALS · 3D ROTATING FAN EXHIBITION (Hanna Stína 00:06–00:14)
           ══════════════════════════════════════════════════════════════ */}
        <div
          ref={fanStageRef}
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center"
        >
          {/* Left: Monumental Swiss-Editorial Typography & Active Piece Placard */}
          <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
            <p
              data-fur-reveal
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium"
            >
              <span className="h-px w-8 bg-[#5E93B8]/60" />
              03 · {isExplicitNewArrival ? "New Arrivals" : "Latest Works"}
              {isLocalPreview && (
                <span className="rounded-full border border-[#5E93B8]/30 bg-white/85 px-2.5 py-0.5 text-[9px] tracking-[0.2em] text-[#5E93B8]">
                  Local Preview
                </span>
              )}
            </p>

            {/* Monumental Left / Indented Display Headline ala Hanna Stína */}
            <h2
              data-fur-reveal
              className="serif text-5xl sm:text-6xl xl:text-[74px] font-light leading-[0.92] tracking-[-0.02em] text-[#232528]"
            >
              NEW
              <span className="block pl-8 sm:pl-14 italic text-[#5E93B8]">
                ARRIVALS
              </span>
            </h2>

            {/* Active Piece Details */}
            {activePiece && (
              <div
                data-fur-reveal
                className="pt-4 border-t border-[#232528]/12 space-y-4"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span className="text-[11px] font-mono text-[#5E93B8] shrink-0">
                      [{String(activeArrivalIdx + 1).padStart(2, "0")}]
                    </span>
                    <h3 className="serif text-2xl sm:text-3xl font-light text-[#232528] leading-tight truncate">
                      {activePiece.name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono tracking-[0.2em] text-[#656B73] shrink-0">
                    {String(activeArrivalIdx + 1).padStart(2, "0")}/
                    {String(newArrivals.length).padStart(2, "0")}
                  </span>
                </div>

                <p className="text-xs uppercase tracking-[0.22em] text-[#656B73]">
                  {activePiece.collection?.name ||
                    activePiece.type?.name ||
                    activePiece.category}
                  {activePiece.specs?.dimensions &&
                  activePiece.specs.dimensions !== "Custom — Made to Order"
                    ? ` · ${activePiece.specs.dimensions}`
                    : ""}
                </p>

                {activePiece.description && (
                  <p className="text-sm font-light leading-relaxed text-[#656B73] max-w-[42ch] line-clamp-2">
                    {activePiece.description}
                  </p>
                )}

                {/* Real Admin-Added Finish / Color Swatches Only */}
                {activeVariants.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      {activeVariants.map((v, idx) => {
                        const hex = resolveSwatchHex(v);
                        const isSelected = idx === activeVariantIdx;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setActiveVariantIdx(idx)}
                            title={getVariantDisplayLabel(v) || v.variant_name}
                            aria-label={`Select ${getVariantDisplayLabel(v) || v.variant_name}`}
                            className={`h-5 w-5 rounded-full border transition-transform duration-200 ${
                              isSelected
                                ? "ring-2 ring-[#232528] ring-offset-2 ring-offset-[#FAF8F4] border-white scale-105"
                                : "border-black/15 hover:scale-110"
                            }`}
                            style={{
                              backgroundColor: hex,
                              backgroundImage: v.preview_image
                                ? `url(${v.preview_image})`
                                : undefined,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                        );
                      })}
                    </div>
                    {selectedVariantLabel && (
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[#656B73]">
                        {selectedVariantLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* Sharp Architectural Action Row ala Hanna Stína */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to={getItemHref(activePiece)}
                    className="group inline-flex items-center gap-2.5 bg-[#232528] px-6 py-3 text-[10px] uppercase tracking-[0.28em] font-medium text-[#FAF8F4] hover:bg-[#5E93B8] transition-colors duration-300"
                  >
                    <span>Inspect Piece</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>

                  <Link
                    to="/furniture"
                    className="text-[10px] uppercase tracking-[0.28em] text-[#232528] hover:text-[#5E93B8] transition-colors underline-grow py-2"
                  >
                    Explore Gallery
                  </Link>

                  {newArrivals.length > 1 && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepArrival(-1)}
                        aria-label="Spin previous new arrival"
                        className="h-9 w-9 border border-[#232528]/18 bg-white text-[#232528] flex items-center justify-center hover:bg-[#232528] hover:text-white transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepArrival(1)}
                        aria-label="Spin next new arrival"
                        className="h-9 w-9 border border-[#232528]/18 bg-white text-[#232528] flex items-center justify-center hover:bg-[#232528] hover:text-white transition-colors"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: 3D Perspective Rotating Radial Fan / Open Lookbook (Hanna Stína 00:06–00:14) */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            {/* Desktop / Tablet 3D Radial Spine Fan */}
            <div
              onPointerEnter={handleFanPointerEnter}
              onPointerDown={handleFanPointerDown}
              onPointerMove={handleFanPointerMove}
              onPointerUp={finishFanDrag}
              onPointerCancel={finishFanDrag}
              onPointerLeave={handleFanPointerLeave}
              className={`hidden sm:flex relative h-[430px] lg:h-[520px] w-full items-center justify-center select-none touch-pan-y ${
                isDraggingFan ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ perspective: "1450px" }}
            >
              {/* Subtle soft floor reflection shadow beneath floating 3D fan */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 w-[56%] h-10 rounded-full blur-2xl opacity-25"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(35,37,40,0.45) 0%, transparent 72%)",
                }}
              />

              {/* Central 3D Hub — all pages radiate smoothly from the central axis */}
              <div
                ref={fanRotorRef}
                className="relative w-0 h-0 will-change-transform"
                style={{
                  transformStyle: "preserve-3d",
                }}
              >
                {fanLeaves.map((leaf, i) => {
                  const isActiveLeaf =
                    leaf.pieceIdx === activeArrivalIdx && i < newArrivals.length;
                  return (
                    <button
                      key={leaf.key}
                      type="button"
                      onClick={() => selectArrival(leaf.pieceIdx, leaf.angle)}
                      aria-label={`View ${leaf.piece.name}`}
                      style={{
                        transformStyle: "preserve-3d",
                        transformOrigin: "left center",
                        transform: `translateY(-50%) rotateY(${leaf.angle}deg) translateX(1.5px)`,
                        backfaceVisibility: "visible",
                        outline: "1px solid transparent",
                      }}
                      className={`group absolute top-0 left-0 w-[200px] md:w-[235px] xl:w-[265px] aspect-[4/3.1] rounded-[2px] bg-white border transition-colors duration-300 focus:outline-none ${
                        isActiveLeaf
                          ? "border-[#5E93B8]/55 shadow-[0_24px_48px_-20px_rgba(35,37,40,0.24)]"
                          : "border-[#232528]/8 shadow-[0_18px_38px_-22px_rgba(35,37,40,0.18)] hover:border-[#5E93B8]/45"
                      }`}
                    >
                      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-white via-[#FAF8F4] to-[#F1EFEA] p-3.5 sm:p-4 flex items-center justify-center">
                        <img
                          src={leaf.img}
                          alt={leaf.piece.name}
                          loading="eager"
                          decoding="async"
                          draggable={false}
                          className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(35,37,40,0.08)] pointer-events-none"
                        />
                        <span className="pointer-events-none absolute bottom-2 left-2.5 text-[8px] font-mono uppercase tracking-[0.2em] text-[#656B73]/80">
                          [{String(leaf.pieceIdx + 1).padStart(2, "0")}]{" "}
                          {leaf.piece.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <span className="pointer-events-none absolute bottom-2 right-4 text-[10px] uppercase tracking-[0.28em] text-[#656B73]/75">
                Drag, scroll or click leaf to turn
              </span>
            </div>

            {/* Mobile Clean Spotlight Card + Swipeable Strip */}
            {activePiece && (
              <div className="sm:hidden">
                <Link
                  to={getItemHref(activePiece)}
                  className="block relative overflow-hidden bg-white aspect-[4/3] p-5 border border-[#232528]/10"
                >
                  <img
                    src={activeHeroImg}
                    alt={activePiece.name}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Minimalist Swiss Index Strip for New Arrivals (Click to rotate 3D Fan directly!) */}
        {newArrivals.length > 1 && (
          <div className="mt-10 lg:mt-12 pt-5 border-t border-[#232528]/12">
            <div
              data-lenis-prevent
              className="flex items-center gap-6 sm:gap-10 overflow-x-auto no-scrollbar pb-1"
            >
              {newArrivals.map((piece, idx) => {
                const isAct = idx === activeArrivalIdx;
                return (
                  <button
                    key={piece.slug}
                    type="button"
                    onClick={() => selectArrival(idx)}
                    className={`shrink-0 inline-flex items-baseline gap-2.5 pb-1.5 border-b transition-colors duration-300 ${
                      isAct
                        ? "border-[#232528] text-[#232528]"
                        : "border-transparent text-[#656B73]/75 hover:text-[#232528]"
                    }`}
                  >
                    <span className="text-[10px] font-mono text-[#5E93B8]">
                      [{String(idx + 1).padStart(2, "0")}]
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.2em] font-medium whitespace-nowrap">
                      {piece.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ACT II — PERMANENT GALLERY · HANNA STÍNA STAGGERED CATEGORY WALL
            Each plate showcases a Furniture Category / Theme and routes straight
            to `/furniture?category=<slug>` with its lifestyle banner & pieces.
           ══════════════════════════════════════════════════════════════ */}
        {permanentCategories.length > 0 && (
          <div className="mt-20 sm:mt-24 lg:mt-28 pt-12 lg:pt-16 border-t border-[#232528]/12">
            {/* Editorial Staggered Header */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-12 lg:mb-16">
              <div className="lg:col-span-8">
                <p className="text-[10px] uppercase tracking-[0.36em] text-[#5E93B8] font-medium mb-3">
                  Permanent Collection · Curated Categories
                </p>
                <h3 className="serif text-4xl sm:text-5xl lg:text-[62px] font-light leading-[0.94] tracking-[-0.015em] text-[#232528]">
                  EXPLORE THE
                  <span className="block sm:pl-14 italic text-[#5E93B8]">
                    PERMANENT GALLERY
                  </span>
                </h3>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <Link
                  to="/furniture"
                  className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-medium text-[#232528] hover:text-[#5E93B8] transition-colors"
                >
                  <span>Full Furniture Archive</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Row 1: Iconic 3-Column Bottom-Aligned Contrasting Heights (`items-end`) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
              {row1Categories.map((cat, idx) => {
                const slot = CATEGORY_ROW1_SLOTS[idx % CATEGORY_ROW1_SLOTS.length];
                return (
                  <PermanentCategoryPlate
                    key={cat.slug}
                    category={cat}
                    index={idx}
                    colClass={slot.colClass}
                    aspectClass={slot.aspectClass}
                  />
                );
              })}
            </div>

            {/* Row 2+: Remaining Categories + Editorial Directory */}
            {row2Categories.length === 1 && (
              <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
                <PermanentCategoryPlate
                  category={row2Categories[0]}
                  index={3}
                  colClass="lg:col-span-6"
                  aspectClass="aspect-[16/10]"
                />
                <div className="lg:col-span-6 lg:pl-8 flex flex-col justify-end space-y-6 pb-2">
                  <p className="serif italic text-2xl sm:text-3xl font-light text-[#656B73] max-w-[26ch]">
                    Objects shaped for quiet permanence — tailored to your space.
                  </p>
                  <div className="pt-4 border-t border-[#232528]/12">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#656B73] mb-3.5">
                      {t("furniture.looking_for", "Browse by Category")}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                      {permanentCategories.map((cat, idx) => (
                        <Link
                          key={cat.slug}
                          to={`/furniture?category=${encodeURIComponent(cat.slug)}`}
                          className="group inline-flex items-baseline gap-1.5 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                        >
                          <span className="text-[10px] font-mono text-[#5E93B8]">
                            [{String(idx + 1).padStart(2, "0")}]
                          </span>
                          <span className="text-xs uppercase tracking-[0.18em] font-medium underline-grow">
                            {cat.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {row2Categories.length === 2 && (
              <div className="mt-14 lg:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
                <PermanentCategoryPlate
                  category={row2Categories[0]}
                  index={3}
                  colClass="lg:col-span-4"
                  aspectClass="aspect-[3/4.1]"
                />
                <PermanentCategoryPlate
                  category={row2Categories[1]}
                  index={4}
                  colClass="lg:col-span-4"
                  aspectClass="aspect-[4/3.1]"
                />
                <div className="md:col-span-2 lg:col-span-4 lg:pl-4 flex flex-col justify-end space-y-6 pb-2">
                  <p className="serif italic text-2xl sm:text-[26px] font-light text-[#656B73] leading-snug">
                    Objects shaped for quiet permanence — tailored to your space.
                  </p>
                  <div className="pt-4 border-t border-[#232528]/12">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#656B73] mb-3.5">
                      {t("furniture.looking_for", "Browse by Category")}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                      {permanentCategories.map((cat, idx) => (
                        <Link
                          key={cat.slug}
                          to={`/furniture?category=${encodeURIComponent(cat.slug)}`}
                          className="group inline-flex items-baseline gap-1.5 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                        >
                          <span className="text-[10px] font-mono text-[#5E93B8]">
                            [{String(idx + 1).padStart(2, "0")}]
                          </span>
                          <span className="text-xs uppercase tracking-[0.18em] font-medium underline-grow">
                            {cat.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {row2Categories.length >= 3 && (
              <>
                <div className="mt-14 lg:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
                  {row2Categories.map((cat, idx) => {
                    const slot =
                      CATEGORY_ROW1_SLOTS[(idx + 1) % CATEGORY_ROW1_SLOTS.length];
                    return (
                      <PermanentCategoryPlate
                        key={cat.slug}
                        category={cat}
                        index={idx + 3}
                        colClass={slot.colClass}
                        aspectClass={slot.aspectClass}
                      />
                    );
                  })}
                </div>
                <div className="mt-12 pt-6 border-t border-[#232528]/12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                  <p className="serif italic text-2xl sm:text-3xl font-light text-[#656B73] max-w-[28ch]">
                    Objects shaped for quiet permanence — tailored to your space.
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                    {permanentCategories.map((cat, idx) => (
                      <Link
                        key={cat.slug}
                        to={`/furniture?category=${encodeURIComponent(cat.slug)}`}
                        className="group inline-flex items-baseline gap-1.5 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                      >
                        <span className="text-[10px] font-mono text-[#5E93B8]">
                          [{String(idx + 1).padStart(2, "0")}]
                        </span>
                        <span className="text-xs uppercase tracking-[0.18em] font-medium underline-grow">
                          {cat.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}

            {row2Categories.length === 0 && (
              <div className="mt-12 pt-6 border-t border-[#232528]/12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <p className="serif italic text-2xl sm:text-3xl font-light text-[#656B73] max-w-[28ch]">
                  Objects shaped for quiet permanence — tailored to your space.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                  {permanentCategories.map((cat, idx) => (
                    <Link
                      key={cat.slug}
                      to={`/furniture?category=${encodeURIComponent(cat.slug)}`}
                      className="group inline-flex items-baseline gap-1.5 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                    >
                      <span className="text-[10px] font-mono text-[#5E93B8]">
                        [{String(idx + 1).padStart(2, "0")}]
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] font-medium underline-grow">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
