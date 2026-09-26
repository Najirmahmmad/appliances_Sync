import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Label = React.forwardRef(({ className, children, required, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 ml-1">*</span>}
    </label>
  );
});
Label.displayName = "Label";

const inputClasses =
  "block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-erp-primary focus:border-transparent transition-shadow";

const Input = React.forwardRef(({ className, icon: Icon, error, ...props }, ref) => {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Icon size={16} />
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          inputClasses,
          Icon && "pl-10",
          error && "border-red-500 focus:ring-red-500 bg-red-50",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";

const Select = React.forwardRef(({ className, icon: Icon, error, children, ...props }, ref) => {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10">
          <Icon size={16} />
        </div>
      )}
      <select
        ref={ref}
        className={cn(
          inputClasses,
          "appearance-none pr-8",
          Icon && "pl-10",
          error && "border-red-500 focus:ring-red-500 bg-red-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";

const Textarea = React.forwardRef(({ className, error, ...props }, ref) => {
  return (
    <div className="relative">
      <textarea
        ref={ref}
        className={cn(
          inputClasses,
          "resize-y min-h-[80px]",
          error && "border-red-500 focus:ring-red-500 bg-red-50",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Label, Input, Select, Textarea };
