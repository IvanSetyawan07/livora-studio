import { api } from "@/lib/api";

export type WishlistType = "item" | "collection" | "project" | "catalog";

export type WishlistEntry = {
  id: number;
  type: WishlistType;
  entity_id: number;
  entity: {
    id: number;
    name: string | null;
    slug: string | null;
    image: string | null;
  } | null;
  created_at: string;
};

let cachedWishlist: WishlistEntry[] | null = null;
let cachedToken: string | null = null;
let inFlightWishlist: Promise<WishlistEntry[]> | null = null;

export const invalidateWishlistCache = () => {
  cachedWishlist = null;
  inFlightWishlist = null;
};

export const getWishlist = (forceRefresh = false): Promise<WishlistEntry[]> => {
  const currentToken = typeof window !== "undefined" ? localStorage.getItem("livora_token") : null;
  if (currentToken !== cachedToken) {
    cachedToken = currentToken;
    cachedWishlist = null;
    inFlightWishlist = null;
  }

  if (!forceRefresh && cachedWishlist) {
    return Promise.resolve(cachedWishlist);
  }

  if (!forceRefresh && inFlightWishlist) {
    return inFlightWishlist;
  }

  inFlightWishlist = api
    .get<WishlistEntry[]>("/wishlist")
    .then((res) => {
      cachedWishlist = res.data;
      return res.data;
    })
    .finally(() => {
      inFlightWishlist = null;
    });

  return inFlightWishlist;
};

export const addToWishlist = (type: WishlistType, id: number) =>
  api.post("/wishlist", { type, id }).then((res) => {
    invalidateWishlistCache();
    return res.data;
  });

export const removeFromWishlist = (type: WishlistType, id: number) =>
  api.delete(`/wishlist/${type}/${id}`).then((res) => {
    if (cachedWishlist) {
      cachedWishlist = cachedWishlist.filter((r) => !(r.type === type && r.entity_id === id));
    }
    return res.data;
  });