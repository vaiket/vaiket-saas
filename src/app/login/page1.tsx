"use client";

import { useState } from "react";

export default function Login() {
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  async function submit() {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json = await res.json();
      console.log("LOGIN RESPONSE:", json);

      if (json.success) {
        alert("Login Successfully!");

        // 🔥 SAVE LOGIN SESSION
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("email", data.email);

        // 🔥 REDIRECT BASED ON ONBOARDING
        if (json.onboardingCompleted) {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/onboarding";
        }
      } else {
        alert(json.error || "Login failed");
      }

    } catch (err) {
      console.error("Login Error:", err);
      alert("Something went wrong!");
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Login</h1>

      <input
        placeholder="Email"
        onChange={(e) => setData({ ...data, email: e.target.value })}
        className="border p-2 block mt-4"
      />

      <input
        placeholder="Password"
        type="password"
        onChange={(e) => setData({ ...data, password: e.target.value })}
        className="border p-2 block mt-4"
      />

      <button
        onClick={submit}
        className="bg-blue-500 text-white mt-4 p-2"
      >
        Login
      </button>
    </div>
  );
}
