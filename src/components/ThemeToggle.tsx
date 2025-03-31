'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative flex h-8 w-16 items-center rounded-full bg-gray-200 dark:bg-gray-800 p-1 transition-colors"
    >
      <span
        className={`transform transition duration-300 ease-in-out ${
          theme === 'dark' ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="h-6 w-6 text-white" />
        ) : (
          <Sun className="h-6 w-6 text-yellow-500" />
        )}
      </span>
    </button>
  )
}