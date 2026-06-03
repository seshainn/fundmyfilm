import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

type RegisterForm = z.infer<typeof schema>;

export default function Register() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);

    try {
      await api.post("/auth/register", data);
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center mt-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 bg-white p-6 shadow rounded w-full max-w-sm"
      >
        <Input {...register("username")} placeholder="Username" />
        {errors.username && (
          <p className="text-sm text-red-500">{errors.username.message}</p>
        )}

        <Input {...register("email")} placeholder="Email" />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}

        <Input
          {...register("password")}
          type="password"
          placeholder="Password"
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          disabled={isSubmitting}
          className="bg-teal-500 text-white px-4 py-2 w-full"
        >
          {isSubmitting ? "Registering..." : "Register"}
        </Button>
      </form>
    </div>
  );
}