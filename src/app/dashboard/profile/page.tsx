"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState({ name: "", password: "", profileImage: "" });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setUser(json.user);
        setData({
          name: json.user.name || "",
          password: "",
          profileImage: json.user.profileImage || "",
        });
      }
    }
    load();
  }, []);

  async function save() {
    const res = await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (json.success) {
      alert("Profile updated!");
      window.location.href = "/dashboard";
    } else {
      alert("Failed to update");
    }
  }

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Profile Settings</h1>

      <label className="block mb-2 font-medium">Name</label>
      <input
        className="border p-2 w-full mb-4"
        value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
      />

      <label className="block mb-2 font-medium">New Password</label>
      <input
        className="border p-2 w-full mb-4"
        type="password"
        value={data.password}
        onChange={(e) => setData({ ...data, password: e.target.value })}
      />

      <label className="block mb-2 font-medium">Profile Image URL</label>
      <input
        className="border p-2 w-full mb-4"
        value={data.profileImage}
        onChange={(e) => setData({ ...data, profileImage: e.target.value })}
      />

      <button
        onClick={save}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Save
      </button>
    </div>
  );
}
