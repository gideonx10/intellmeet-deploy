import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Loader2, Handshake, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { mutate: login, isPending, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => login(data);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
            <Handshake className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">IntellMeet</h1>
          <p className="text-slate-500 text-sm mt-1">AI-powered meetings, reimagined</p>
        </div>

        <Card className="border border-slate-200 shadow-sm [--card-spacing:1.5rem]">
          <CardHeader className="pb-5">
            <CardTitle className="text-lg font-semibold text-slate-800">Welcome back</CardTitle>
            <CardDescription className="text-slate-500 text-sm">Sign in to your account</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-3 py-2">
                  {(error as any)?.response?.data?.message || "Invalid credentials"}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 text-sm">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  className="border-slate-200 focus:ring-blue-500"
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    {...register("password")}
                    className="border-slate-200 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-3">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isPending}
              >
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign in"}
              </Button>
              <p className="text-sm text-slate-500 text-center">
                Don't have an account?{" "}
                <Link to="/signup" className="text-blue-600 hover:underline font-medium">Create one</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}