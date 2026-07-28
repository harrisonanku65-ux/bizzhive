import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { uploadFile } from "@/lib/uploads";
import { checkPassword, PASSWORD_MIN_LENGTH } from "@/lib/password";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Loader2, LogIn, Upload } from "lucide-react";
import {
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
} from "@workspace/api-client-react";

export default function Settings() {
  const { user, isLoading: authLoading, updateUser } = useAuth();

  // --- Profile ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const updateProfile = useUpdateProfile();

  // `user` is null on first render (the auth check hasn't resolved yet), so
  // the form fields are populated here once it loads rather than via
  // useState's initializer, which only ever sees that first, empty render.
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setDisplayName(user.displayName ?? "");
    setPhone(user.phone ?? "");
    setAvatar(user.avatar ?? "");
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setProfileError("");
    try {
      const url = await uploadFile(file);
      setAvatar(url);
    } catch (err: any) {
      setProfileError(err?.message ?? "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    updateProfile.mutate(
      { data: { firstName, lastName, displayName, phone, avatar } },
      {
        onSuccess: (data) => {
          updateUser(data);
          setProfileSaved(true);
        },
        onError: (err: any) => {
          setProfileError(err?.data?.error ?? "Couldn't save your profile. Try again.");
        },
      },
    );
  };

  // --- Password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const changePassword = useChangePassword();
  const newPasswordCheck = checkPassword(newPassword, {
    email: user?.email,
    firstName: user?.firstName ?? undefined,
    lastName: user?.lastName ?? undefined,
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (!newPasswordCheck.valid) {
      setPasswordError(newPasswordCheck.error ?? "Please choose a stronger password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    changePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setPasswordSaved(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
        },
        onError: (err: any) => {
          setPasswordError(err?.data?.error ?? "Couldn't change your password. Try again.");
        },
      },
    );
  };

  // --- Danger zone: delete account ---
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const deleteAccount = useDeleteAccount();

  const handleDeleteAccount = () => {
    setDeleteError("");
    deleteAccount.mutate(
      { data: { password: deletePassword } },
      {
        onSuccess: () => {
          window.location.href = "/";
        },
        onError: (err: any) => {
          setDeleteError(err?.data?.error ?? "Failed to delete account");
        },
      },
    );
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <LogIn className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Sign In Required</h1>
        <p className="text-muted-foreground mb-6">Sign in to manage your account settings.</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-bold mb-2">Account Settings</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage your profile, password, and account.
      </p>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Profile</h2>

            {profileError && (
              <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {profileError}
              </div>
            )}
            {profileSaved && (
              <div className="bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Profile updated.
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {(displayName || firstName || user.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {avatarUploading ? "Uploading..." : "Change photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244000000"
                  className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="w-full bg-muted/60 rounded-lg px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Changing your email isn't supported yet — contact support if you need this.
                </p>
              </div>

              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Change Password</h2>

            {passwordError && (
              <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSaved && (
              <div className="bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Password changed.
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <PasswordInput
                label="Current Password"
                name="current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <PasswordInput
                label="New Password"
                name="new-password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrength check={newPasswordCheck} show={newPassword.length > 0} />
              <PasswordInput
                label="Confirm New Password"
                name="confirm-new-password"
                autoComplete="new-password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />

              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/30">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently remove your personal data. Enter your password to confirm.
            </p>

            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}

            <Separator />

            <div className="space-y-3">
              <PasswordInput
                label="Password"
                name="delete-password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending || !deletePassword}
              >
                {deleteAccount.isPending ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
