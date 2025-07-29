"use client"

import { Settings } from "lucide-react"

interface SettingsButtonProps {
  onClick: () => void
  theme: "light" | "dark"
}

export function SettingsButton({ onClick, theme }: SettingsButtonProps) {
  const isDark = theme === "dark"

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isDark
          ? "hover:bg-gray-700 text-gray-400 hover:text-white"
          : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
      }`}
      title="Settings"
    >
      <Settings size={20} />
    </button>
  )
}
