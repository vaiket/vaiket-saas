"use client";

import React from "react";

export function Switch({ checked, onChange }: any) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-10 h-5 bg-gray-300 peer-focus:ring-2 rounded-full peer peer-checked:bg-black transition-all"></div>
      <div className="absolute left-1 top-1 bg-white w-3.5 h-3.5 rounded-full peer-checked:translate-x-5 transition-all"></div>
    </label>
  );
}
