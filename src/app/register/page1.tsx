"use client";

import { useState } from "react";

export default function Register() {
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    business: "",
  });

  async function submit() {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const json = await res.json();
    console.log(json);
    alert("Registered Successfully!");
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Register</h1>

      <input placeholder="Name" onChange={e => setData({...data, name:e.target.value})} className="border p-2 block mt-4"/>
      <input placeholder="Email" onChange={e => setData({...data, email:e.target.value})} className="border p-2 block mt-2"/>
      <input placeholder="Password" onChange={e => setData({...data, password:e.target.value})} className="border p-2 block mt-2"/>
      <input placeholder="Business Name" onChange={e => setData({...data, business:e.target.value})} className="border p-2 block mt-2"/>

      <button onClick={submit} className="bg-blue-500 text-white mt-4 p-2">
        Submit
      </button>
    </div>
  );
}
