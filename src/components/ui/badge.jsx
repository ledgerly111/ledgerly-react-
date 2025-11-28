import React from 'react';
import { cn } from '../../lib/utils.js';

const variantClasses = {
  default: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  secondary: 'border-slate-500/40 bg-slate-700/40 text-slate-200',
  destructive: 'border-red-500/40 bg-red-500/10 text-red-300',
  outline: 'border-gray-600/60 text-gray-300',
};

const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-gray-900';

export function Badge({ className, variant = 'default', ...props }) {
  const variantClassName = variantClasses[variant] ?? variantClasses.default;
  return (
    <div
      className={cn(baseClasses, variantClassName, className)}
      {...props}
    />
  );
}
