import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  paletteOpen: boolean
  paletteScope: 'all' | 'normativa'
  toggleSidebar: () => void
  setMobileNav: (v: boolean) => void
  openPalette: (scope?: UiState['paletteScope']) => void
  setPaletteOpen: (v: boolean) => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      paletteOpen: false,
      paletteScope: 'all',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNav: (v) => set({ mobileNavOpen: v }),
      openPalette: (scope = 'all') => set({ paletteOpen: true, paletteScope: scope }),
      setPaletteOpen: (v) => set({ paletteOpen: v }),
    }),
    { name: 'lspd-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
)
