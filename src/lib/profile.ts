import { api } from "@/lib/api";

export type UpdateProfilePayload = {
  name: string;
  phone?: string;
  address?: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};

export const updateProfile = (payload: UpdateProfilePayload) =>
  api.put("/me", payload).then((res) => res.data);

export const changePassword = (payload: ChangePasswordPayload) =>
  api.post("/me/password", payload).then((res) => res.data);