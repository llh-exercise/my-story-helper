import { create } from 'zustand'

type UiState = {
  pageTitle: string
  setPageTitle: (t: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  pageTitle: '故事小助手',
  setPageTitle: (pageTitle) => set({ pageTitle }),
}))
