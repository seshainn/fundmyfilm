// src/pages/Register.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Register() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    await api.post("/auth/register", data);
  };

  return (
    <div className="flex items-center justify-center mt-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 bg-white p-6 shadow rounded"
      >
        <Input {...register("username")} placeholder="Username" />
        <Input {...register("email")} placeholder="Email" />
        <Input {...register("password")} type="password" placeholder="Password" />

        <Button className="bg-teal-500 text-white px-4 py-2">
          Register
        </Button>
      </form>
    </div>
  );
}