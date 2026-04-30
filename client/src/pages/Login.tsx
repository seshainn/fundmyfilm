// src/pages/Login.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  const setToken = useAuthStore((s) => s.setToken);

  const onSubmit = async (data: any) => {
    const res = await api.post("/auth/login", data);
    setToken(res.data.accessToken);
  };

  return (
    <div className="flex items-center justify-center mt-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 bg-white p-6 shadow rounded"
      >
        <Input {...register("email")} placeholder="Email" />
        <Input {...register("password")} type="password" placeholder="Password" />

        <Button className="bg-orange-500 text-white px-4 py-2">
          Login
        </Button>
      </form>
    </div>
  );
}