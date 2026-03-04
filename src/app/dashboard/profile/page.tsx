"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  profileImage: string | null;
  role?: string | null;
};

type FlashMessage = {
  type: "success" | "error";
  text: string;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    mobile: "",
    profileImage: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [profileMessage, setProfileMessage] = useState<FlashMessage | null>(
    null
  );

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<FlashMessage | null>(
    null
  );

  const [otpRequested, setOtpRequested] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpResetting, setOtpResetting] = useState(false);
  const [otpForm, setOtpForm] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otpMessage, setOtpMessage] = useState<FlashMessage | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  const avatarSrc = useMemo(() => {
    const source = profileForm.profileImage || user?.profileImage || "";
    return source || "/api/avatar-default.png";
  }, [profileForm.profileImage, user?.profileImage]);

  async function loadProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        user?: UserProfile;
      };

      if (!res.ok || !json?.success || !json.user) {
        setProfileMessage({
          type: "error",
          text: json?.error || "Unable to load profile details.",
        });
        return;
      }

      setUser(json.user);
      setProfileForm({
        name: json.user.name || "",
        mobile: json.user.mobile || "",
        profileImage: json.user.profileImage || "",
      });
    } catch {
      setProfileMessage({
        type: "error",
        text: "Unable to load profile details.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onAvatarSelect(file: File | undefined) {
    if (!file) return;

    setProfileMessage(null);
    setAvatarFileName("");

    if (!file.type.startsWith("image/")) {
      setProfileMessage({
        type: "error",
        text: "Only image files are allowed.",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setProfileMessage({
        type: "error",
        text: "Image size must be under 5MB.",
      });
      return;
    }

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !json?.url) {
        setProfileMessage({
          type: "error",
          text: json?.error || "Image upload failed.",
        });
        return;
      }

      setProfileForm((prev) => ({
        ...prev,
        profileImage: json.url || "",
      }));
      setAvatarFileName(file.name);
      setProfileMessage({
        type: "success",
        text: "Image uploaded. Click Save Profile to apply it.",
      });
    } catch {
      setProfileMessage({
        type: "error",
        text: "Image upload failed. Please try again.",
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    setProfileMessage(null);

    if (!profileForm.name.trim()) {
      setProfileMessage({ type: "error", text: "Name is required." });
      return;
    }

    try {
      setProfileSaving(true);
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profileForm.name.trim(),
          mobile: profileForm.mobile.trim() || null,
          profileImage: profileForm.profileImage.trim() || null,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        user?: UserProfile;
      };

      if (!res.ok || !json?.success) {
        setProfileMessage({
          type: "error",
          text: json?.error || "Failed to update profile.",
        });
        return;
      }

      if (json.user) {
        setUser(json.user);
        setProfileForm({
          name: json.user.name || "",
          mobile: json.user.mobile || "",
          profileImage: json.user.profileImage || "",
        });
      } else {
        await loadProfile();
      }

      setProfileMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch {
      setProfileMessage({
        type: "error",
        text: "Failed to update profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    setPasswordMessage(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please fill all password fields.",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New and confirm passwords do not match.",
      });
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwordForm),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !json?.success) {
        setPasswordMessage({
          type: "error",
          text: json?.error || "Failed to update password.",
        });
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully.",
      });
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Failed to update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function sendResetOtp() {
    if (!user?.email) return;

    setOtpMessage(null);
    try {
      setOtpSending(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: user.email }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !json?.success) {
        setOtpMessage({
          type: "error",
          text: json?.error || "Failed to send OTP email.",
        });
        return;
      }

      setOtpRequested(true);
      setOtpMessage({
        type: "success",
        text: `OTP sent to ${user.email}.`,
      });
    } catch {
      setOtpMessage({
        type: "error",
        text: "Failed to send OTP email.",
      });
    } finally {
      setOtpSending(false);
    }
  }

  async function resetByOtp() {
    if (!user?.email) return;
    setOtpMessage(null);

    if (!otpForm.otp.trim() || !otpForm.newPassword || !otpForm.confirmPassword) {
      setOtpMessage({
        type: "error",
        text: "OTP and password fields are required.",
      });
      return;
    }

    if (otpForm.newPassword.length < 8) {
      setOtpMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }

    if (otpForm.newPassword !== otpForm.confirmPassword) {
      setOtpMessage({
        type: "error",
        text: "New and confirm passwords do not match.",
      });
      return;
    }

    try {
      setOtpResetting(true);
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: user.email,
          otp: otpForm.otp.trim(),
          newPassword: otpForm.newPassword,
        }),
      });

      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json?.success) {
        setOtpMessage({
          type: "error",
          text: json?.error || "OTP verification failed.",
        });
        return;
      }

      setOtpForm({
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      setOtpMessage({
        type: "success",
        text: "Password reset successful using email OTP.",
      });
    } catch {
      setOtpMessage({
        type: "error",
        text: "Failed to reset password via OTP.",
      });
    } finally {
      setOtpResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Unable to load profile. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your profile photo, account details and password security.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserRound className="h-5 w-5 text-indigo-600" />
            Personal Details
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[140px_1fr]">
            <div className="space-y-3">
              <img
                src={avatarSrc}
                alt="Profile"
                className="h-28 w-28 rounded-2xl border border-slate-200 object-cover"
              />
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                <UploadCloud className="h-4 w-4" />
                {avatarUploading ? "Uploading..." : "Upload from device"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void onAvatarSelect(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {avatarFileName ? (
                <p className="text-xs text-slate-500">{avatarFileName}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Full Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
                    value={profileForm.mobile}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    placeholder="+91..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email (read-only)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  value={user.email}
                  readOnly
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profile Image URL
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  value={profileForm.profileImage}
                  readOnly
                />
              </div>
            </div>
          </div>

          {profileMessage ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                profileMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {profileMessage.text}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={profileSaving || avatarUploading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Account Summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-900">{user.name || "-"}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 font-medium text-slate-900 break-all">{user.email}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
              <dd className="mt-1 font-medium capitalize text-slate-900">
                {user.role || "member"}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            Change Password
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Update password using your current password for security.
          </p>

          <div className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
            />
            <input
              type="password"
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
            />
          </div>

          {passwordMessage ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                passwordMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {passwordMessage.text}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void changePassword()}
            disabled={passwordSaving}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Mail className="h-5 w-5 text-sky-600" />
            Forgot Current Password
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Send OTP to your email, then set a new password directly from here.
          </p>

          <button
            type="button"
            onClick={() => void sendResetOtp()}
            disabled={otpSending}
            className="mt-4 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {otpSending ? "Sending OTP..." : `Send OTP to ${user.email}`}
          </button>

          {otpRequested ? (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otpForm.otp}
                onChange={(e) =>
                  setOtpForm((prev) => ({ ...prev, otp: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 transition focus:border-sky-400 focus:ring"
              />
              <input
                type="password"
                placeholder="New password"
                value={otpForm.newPassword}
                onChange={(e) =>
                  setOtpForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 transition focus:border-sky-400 focus:ring"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={otpForm.confirmPassword}
                onChange={(e) =>
                  setOtpForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 transition focus:border-sky-400 focus:ring"
              />
              <button
                type="button"
                onClick={() => void resetByOtp()}
                disabled={otpResetting}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpResetting ? "Resetting..." : "Verify OTP & Reset Password"}
              </button>
            </div>
          ) : null}

          {otpMessage ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                otpMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {otpMessage.text}
            </p>
          ) : null}
        </article>
      </section>
    </div>
  );
}

