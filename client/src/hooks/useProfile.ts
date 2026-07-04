import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types/user";

interface UpdateProfileInput {
  name?: string;
  avatar?: File;
}

export const useUpdateProfile = () => {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: ({ name, avatar }: UpdateProfileInput) => {
      const formData = new FormData();
      if (name) formData.append("name", name);
      if (avatar) formData.append("avatar", avatar);
      return api.put("/users/profile", formData, { headers: { "Content-Type": undefined } });
    },
    onSuccess: ({ data }) => {
      setUser(data.user as User);
    },
  });
};
