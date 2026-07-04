import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { ArrowLeft, Camera, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { useUpdateProfile } from "@/hooks/useProfile";
import { useMyTeams } from "@/hooks/useTeams";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mutate: updateProfile, isPending, error, isSuccess } = useUpdateProfile();
  const { data: teams, isLoading: loadingTeams } = useMyTeams();

  const [name, setName] = useState(user?.name ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = () => {
    updateProfile({ name: name.trim() || undefined, avatar: avatarFile ?? undefined });
  };

  const displayAvatar = avatarPreview ?? user?.avatar;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-slate-800">Your Profile</span>
      </header>

      <main className="max-w-md mx-auto px-6 py-10">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Profile details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center group"
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-blue-700">{user?.name?.[0]?.toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              <p className="text-xs text-slate-400">Click your photo to change it</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>

            {error && (
              <p className="text-xs text-red-500">
                {isAxiosError(error) ? error.response?.data?.message || "Failed to update profile" : "Failed to update profile"}
              </p>
            )}
            {isSuccess && <p className="text-xs text-green-600">Profile updated ✓</p>}

            <Button className="w-full" disabled={isPending || (!name.trim() && !avatarFile)} onClick={handleSave}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UsersRound className="w-4 h-4 text-slate-400" /> Your teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTeams ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : !teams || teams.length === 0 ? (
              <p className="text-sm text-slate-400">You're not on any team yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {teams.map((t) => (
                  <li key={t._id} className="text-sm text-slate-700">
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
