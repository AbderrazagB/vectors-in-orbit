import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export const Button = ({ children, variant = 'primary', className, ...props }) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200/50 border border-transparent",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm",
    dark: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      className={clsx("px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2", variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};