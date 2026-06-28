import leafAsset from "@/assets/decorations/leaf-branch.png.asset.json";
import flowerAsset from "@/assets/decorations/flower-stem.png.asset.json";

const leafImg = leafAsset.url;
const flowerImg = flowerAsset.url;

interface BackgroundDecorationProps {
  offset: number;
  isFurnitureVisible: boolean;
}

/**
 * Responsive decorative layer that replaces the legacy desktop-only wallpaper.
 * Individual decorations are positioned independently and scale per breakpoint,
 * so nothing gets cropped on tablet/mobile. Reuses the existing parallax offset.
 */
export default function BackgroundDecoration({
  offset,
  isFurnitureVisible,
}: BackgroundDecorationProps) {
  const baseImg =
    "absolute opacity-70 md:opacity-80 select-none pointer-events-none";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{
        transform: `translate3d(0, ${-offset}px, 0)`,
        transition: isFurnitureVisible ? "none" : "transform 0.1s ease-out",
        willChange: "transform",
      }}
    >
      {/* Soft warm canvas to match the previous wallpaper mood */}
      <div className="absolute inset-0 bg-[#f7f3ec]" />

      {/* Top Left Leaf */}
      <img
        src={leafImg}
        alt=""
        loading="lazy"
        className={`${baseImg} -top-8 -left-10 w-28 sm:w-40 md:w-56 lg:w-72 xl:w-80 -rotate-12`}
      />

      {/* Top Right Leaf (mirrored) */}
      <img
        src={leafImg}
        alt=""
        loading="lazy"
        className={`${baseImg} -top-10 -right-10 w-28 sm:w-40 md:w-56 lg:w-72 xl:w-80 -scale-x-100 rotate-12`}
      />

      {/* Left Flower */}
      <img
        src={flowerImg}
        alt=""
        loading="lazy"
        className={`${baseImg} top-1/3 -left-8 w-24 sm:w-32 md:w-44 lg:w-56 xl:w-64 -rotate-6`}
      />

      {/* Right Flower (mirrored) */}
      <img
        src={flowerImg}
        alt=""
        loading="lazy"
        className={`${baseImg} top-2/3 -right-8 w-24 sm:w-32 md:w-44 lg:w-56 xl:w-64 -scale-x-100 rotate-6`}
      />

      {/* Bottom Left Leaf */}
      <img
        src={leafImg}
        alt=""
        loading="lazy"
        className={`${baseImg} -bottom-10 -left-12 w-28 sm:w-40 md:w-56 lg:w-72 xl:w-80 rotate-180`}
      />

      {/* Bottom Right Leaf (mirrored) */}
      <img
        src={leafImg}
        alt=""
        loading="lazy"
        className={`${baseImg} -bottom-12 -right-12 w-28 sm:w-40 md:w-56 lg:w-72 xl:w-80 -scale-x-100 rotate-180`}
      />
    </div>
  );
}
