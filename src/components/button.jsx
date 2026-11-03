import * as React from "react";

export function Button({ className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg 
        bg-blue-600 text-white shadow 
        px-4 py-2 font-medium 
        hover:bg-blue-700 
        focus:outline-none focus:ring-2 focus:ring-blue-500 
        dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400
        ${className}`}
      {...props}
    />
  );
}
