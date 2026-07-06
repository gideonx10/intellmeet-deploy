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
import { useSignup } from "@/hooks/useAuth";
import { signupEmailSchema, passwordSchema } from "@/lib/authValidation";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: signupEmailSchema,
  password: passwordSchema,
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { mutate: signup, isPending, error } = useSignup();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (data: SignupForm) => signup(data);

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
            <CardTitle className="text-lg font-semibold text-slate-800">Create your account</CardTitle>
            <CardDescription className="text-slate-500 text-sm">Start collaborating with your team</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              {/* Global error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-3 py-2">
                  {(error as any)?.response?.data?.message || "Something went wrong"}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-700 text-sm">Full name</Label>
                <Input
                  id="name"
                  placeholder="Aditya Panchal"
                  {...register("name")}
                  className="border-slate-200 focus:ring-blue-500"
                />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>

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
                    placeholder="6+ chars, upper, lower, number & symbol"
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
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</> : "Create account"}
              </Button>
              <p className="text-sm text-slate-500 text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}