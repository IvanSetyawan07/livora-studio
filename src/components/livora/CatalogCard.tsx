import { Link } from "react-router-dom";
import { CatalogItem } from "@/types/catalog";
import { imgUrl } from "@/lib/adminApi";


interface CatalogCardProps {
  item: CatalogItem;
  index?: number;
}

export const CatalogCard = ({ item, index = 0 }: CatalogCardProps) => {
  // FIX: Baca cover_image (snake_case dari API) atau coverImage (camelCase dari seed)
  const imageUrl = item.cover_image ? imgUrl(item.cover_image) : item.coverImage ?? null;

  return (
    <Link
      to={`/catalog/${item.category}/${item.slug}`}
      state={{ preload: item }}
      className="group block reveal"
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Image block — landscape 4:3 */}
      <div className="hover-zoom relative w-full overflow-hidden bg-secondary aspect-[4/3]">
        {imageUrl ? (
  <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <div className="text-center space-y-2 opacity-30">
              <div className="grid grid-cols-2 gap-1.5 mx-auto w-10">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square border border-foreground/40 rounded-[1px]" />
                ))}
              </div>
            </div>
          </div>
        )}

        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.12em] bg-background/88 backdrop-blur-sm text-muted-foreground px-2 py-1 font-light">
          {item.taxonomy}
        </span>

        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/8 transition-colors duration-500" />
      </div>

      {/* Text block */}
      <div className="pt-3 pb-1">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1 font-light">
          {item.category.replace(/-/g, " ")}
        </p>
        <h3 className="serif text-base font-light leading-tight text-foreground mb-1.5 group-hover:text-muted-foreground transition-colors duration-300">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground font-light leading-relaxed line-clamp-2">
          {item.description}
        </p>
      </div>
    </Link>
  );
};