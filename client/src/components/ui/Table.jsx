import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TableWrap = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("w-full overflow-x-auto rounded-lg border border-slate-200 shadow-sm", className)} {...props}>
    <table className="w-full text-sm text-left">{children}</table>
  </div>
));
TableWrap.displayName = "TableWrap";

const TableHead = React.forwardRef(({ className, children, ...props }, ref) => (
  <thead ref={ref} className={cn("text-xs text-slate-500 uppercase bg-slate-50 font-bold tracking-wider", className)} {...props}>
    {children}
  </thead>
));
TableHead.displayName = "TableHead";

const TableBody = React.forwardRef(({ className, children, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-slate-200 bg-white", className)} {...props}>
    {children}
  </tbody>
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef(({ className, children, ...props }, ref) => (
  <tr ref={ref} className={cn("hover:bg-slate-50 transition-colors", className)} {...props}>
    {children}
  </tr>
));
TableRow.displayName = "TableRow";

const TableHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <th ref={ref} className={cn("px-6 py-4 truncate font-bold text-slate-500", className)} {...props}>
    {children}
  </th>
));
TableHeader.displayName = "TableHeader";

const TableCell = React.forwardRef(({ className, children, ...props }, ref) => (
  <td ref={ref} className={cn("px-6 py-4 whitespace-nowrap text-slate-700", className)} {...props}>
    {children}
  </td>
));
TableCell.displayName = "TableCell";

export { TableWrap, TableHead, TableBody, TableRow, TableHeader, TableCell };
