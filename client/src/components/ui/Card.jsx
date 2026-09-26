import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Card = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("bg-white border text-sm text-slate-800 border-slate-200 rounded-xl shadow-sm overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <h3 ref={ref} className={cn("text-xs font-bold text-erp-primary uppercase tracking-wider", className)} {...props}>
      {children}
    </h3>
  );
});
CardTitle.displayName = "CardTitle";

const CardBody = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
});
CardBody.displayName = "CardBody";

const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center", className)} {...props}>
      {children}
    </div>
  );
});
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardBody, CardFooter };
