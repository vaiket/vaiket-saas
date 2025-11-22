"use client";

import React from "react";
import clsx from "clsx";

export function Input({ className = "", ...props }: any) {
  return (
    <input
      className={clsx(
        "w-full px-3 py-2 border rounded-md text-sm outline-none",
        "focus:ring-2 focus:ring-black/50 focus:border-black",
        className
      )}
      {...props}
    />
  );
}
