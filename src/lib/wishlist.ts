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

export const getWishlist = () =>
  api.get<WishlistEntry[]>("/wishlist").then((res) => res.data);

export const addToWishlist = (type: WishlistType, id: number) =>
  api.post("/wishlist", { type, id }).then((res) => res.data);

export const removeFromWishlist = (type: WishlistType, id: number) =>
  api.delete(`/wishlist/${type}/${id}`).then((res) => res.data);