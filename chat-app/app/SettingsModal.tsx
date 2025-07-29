"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"

interface ConfluenceData {
  items: string[]
}

interface SVPortalData {
  username: string
  password: string
  entities: string[]
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  theme: "light" | "dark"
}

export function SettingsModal({ isOpen, onClose, theme }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"confluence" | "svportal">("confluence")
  const [confluenceInput, setConfluenceInput] = useState("")
  const [confluenceData, setConfluenceData] = useState<ConfluenceData>({ items: [] })
  const [svPortalData, setSvPortalData] = useState<SVPortalData>({
    username: "",
    password: "",
    entities: [""],
  })

  useEffect(() => {
    const savedConfluence = localStorage.getItem("confluence-settings")
    const savedSVPortal = localStorage.getItem("svportal-settings")
    if (savedConfluence) setConfluenceData(JSON.parse(savedConfluence))
    if (savedSVPortal) setSvPortalData(JSON.parse(savedSVPortal))
  }, [])

  const handleAddConfluenceItem = () => {
    if (confluenceInput.trim()) {
      setConfluenceData((prev) => ({
        items: [...prev.items, confluenceInput.trim()],
      }))
      setConfluenceInput("")
    }
  }

  const handleRemoveConfluenceItem = (index: number) => {
    setConfluenceData((prev) => ({
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const handleAddEntity = () => {
    setSvPortalData((prev) => ({
      ...prev,
      entities: [...prev.entities, ""],
    }))
  }

  const handleRemoveEntity = (index: number) => {
    setSvPortalData((prev) => ({
      ...prev,
      entities: prev.entities.filter((_, i) => i !== index),
    }))
  }

  const handleEntityChange = (index: number, value: string) => {
    setSvPortalData((prev) => ({
      ...prev,
      entities: prev.entities.map((entity, i) => (i === index ? value : entity)),
    }))
  }

  const handleSave = () => {
    if (activeTab === "confluence") {
      localStorage.setItem("confluence-settings", JSON.stringify(confluenceData))
    } else {
      const filtered = {
        ...svPortalData,
        entities: svPortalData.entities.filter((e) => e.trim() !== ""),
      }
      localStorage.setItem("svportal-settings", JSON.stringify(filtered))
    }
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && activeTab === "confluence") {
      handleAddConfluenceItem()
    }
  }

  if (!isOpen) return null

  const isDark = theme === "dark"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl mx-4 transform rounded-2xl border shadow-2xl transition-all duration-300 ${
          isDark
            ? "bg-gray-800 border-gray-700 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-600/30">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-600/30 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600/30">
          {["confluence", "svportal"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-1/2 py-3 text-sm font-medium transition-all ${
                activeTab === tab
                  ? isDark
                    ? "text-blue-400 border-b-2 border-blue-400 bg-gray-700/40"
                    : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "confluence" ? "Confluence" : "SV Portal"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {activeTab === "confluence" ? (
            <div className="space-y-5">
              {/* Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={confluenceInput}
                  onChange={(e) => setConfluenceInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter confluence item..."
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500"
                  }`}
                />
                <button
                  onClick={handleAddConfluenceItem}
                  disabled={!confluenceInput.trim()}
                  className={`p-2 rounded-lg transition-all ${
                    confluenceInput.trim()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* List */}
              {confluenceData.items.length > 0 ? (
                <div className="space-y-2">
                  {confluenceData.items.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        isDark ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <span className="text-sm">{item}</span>
                      <button
                        onClick={() => handleRemoveConfluenceItem(index)}
                        className="p-1 rounded hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center text-gray-400 pt-4">No items added yet</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={svPortalData.username}
                  onChange={(e) => setSvPortalData((prev) => ({ ...prev, username: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500"
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={svPortalData.password}
                  onChange={(e) => setSvPortalData((prev) => ({ ...prev, password: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500"
                  }`}
                />
              </div>

              {/* Entities */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Entities</label>
                  <button
                    onClick={handleAddEntity}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                  >
                    <Plus size={12} />
                    Add Entity
                  </button>
                </div>
                <div className="space-y-3">
                  {svPortalData.entities.map((entity, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={entity}
                        onChange={(e) => handleEntityChange(index, e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isDark
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500"
                        }`}
                      />
                      {svPortalData.entities.length > 1 && (
                        <button
                          onClick={() => handleRemoveEntity(index)}
                          className="px-2 py-2 rounded hover:text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 px-6 py-5 border-t border-gray-600/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
