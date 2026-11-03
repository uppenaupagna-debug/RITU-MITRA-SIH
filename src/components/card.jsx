import React from "react";

export function Card({ children, className }) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl shadow-md text-black dark:text-white ${className || ""}`}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className }) {
  return <div className={`p-4 ${className || ""}`}>{children}</div>;
}
