"use client";

import React from "react";
import clsx from "clsx";

export function Button({ 
  children, 
  className = "", 
  variant = "default",
  ...props 
}: any) {

  const styles = {
    default: "bg-black text-white hover:bg-gray-900",
    outline: "border border-gray-300 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={clsx(
        "px-4 py-2 rounded-md text-sm font-medium transition-all",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
