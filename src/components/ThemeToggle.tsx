// src/components/ThemeToggle.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // Estado para el tema
  const [theme, setTheme] = useState<string | null>(null);

  // Inicializar el tema al cargar el componente
  useEffect(() => {
    // Obtener el tema del localStorage o usar el tema del sistema por defecto
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    // Aplicar la clase al elemento <html>
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  // Manejar el cambio de tema
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // No renderizar hasta que el tema esté inicializado
  if (!theme) return null;

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-8 w-16 items-center rounded-full bg-gray-200 dark:bg-gray-800 p-1 transition-colors"
    >
      <span
        className={`transform transition duration-300 ease-in-out ${
          theme === "dark" ? "translate-x-8" : "translate-x-0"
        }`}
      >
        {theme === "dark" ? (
          <Moon className="h-6 w-6 text-white" />
        ) : (
          <Sun className="h-6 w-6 text-yellow-500" />
        )}
      </span>
    </button>
  );
}