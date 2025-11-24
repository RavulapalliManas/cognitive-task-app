"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) setIsDark(saved === "true");
  }, []);

  const toggleDark = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem("darkMode", String(newMode));
    document.documentElement.classList.toggle("dark", newMode);
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl backdrop-saturate-150 transition-all ${isDark ? 'bg-gray-900/70 border-gray-800/50' : 'bg-white/70 border-white/20'} border-b shadow-sm`}
      style={{
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className={`text-xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          CogniTest
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className={`text-sm font-medium hover:opacity-60 transition-opacity ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Home</Link>
          <Link href="/tests" className={`text-sm font-medium hover:opacity-60 transition-opacity ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Tests</Link>
          <Link href="/results" className={`text-sm font-medium hover:opacity-60 transition-opacity ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Results</Link>
          <Link href="/settings" className={`text-sm font-medium hover:opacity-60 transition-opacity ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Settings</Link>
          <Link href="/admin" className={`text-sm font-medium hover:opacity-60 transition-opacity ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Admin</Link>
          <button
            onClick={toggleDark}
            className={`p-2 rounded-full transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-gray-800/50 text-yellow-400' : 'bg-gray-100/50 text-gray-900'}`}
            aria-label="Toggle dark mode"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
