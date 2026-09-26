import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Badge = React.forwardRef(({ className, variant = "info", children, ...props }, ref) => {
  const variants = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200"
  };

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = "Badge";

const Mention = React.forwardRef(({ className, name, ...props }, ref) => {
  return (
    <span 
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-erp-primary text-sm font-medium border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors",
        className
      )}
      {...props}
    >
      <span className="opacity-70 font-normal">@</span>{name}
    </span>
  );
});

Mention.displayName = "Mention";

export { Badge, Mention };
