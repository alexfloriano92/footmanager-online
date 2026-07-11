import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User, Coach, Club, Finance, Season, Notification } from '@/types';

interface GameState {
  // Auth & Identity
  user: User | null;
  coach: Coach | null;
  club: Club | null;
  finances: Finance | null;
  
  // Game Context
  currentSeason: Season | null;
  notifications: Notification[];
  unreadNotificationsCount: number;
  
  // UI State
  isSidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setUser: (user: User | null) => void;
  setCoach: (coach: Coach | null) => void;
  setClub: (club: Club | null) => void;
  setFinances: (finances: Finance | null) => void;
  setCurrentSeason: (season: Season | null) => void;
  
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  logout: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Initial State
      user: null,
      coach: null,
      club: null,
      finances: null,
      currentSeason: null,
      notifications: [],
      unreadNotificationsCount: 0,
      isSidebarOpen: true,
      theme: 'system',

      // Actions
      setUser: (user) => set({ user }),
      setCoach: (coach) => set({ coach }),
      setClub: (club) => set({ club }),
      setFinances: (finances) => set({ finances }),
      setCurrentSeason: (currentSeason) => set({ currentSeason }),
      
      addNotification: (notification) => set((state) => ({ 
        notifications: [notification, ...state.notifications],
        unreadNotificationsCount: state.unreadNotificationsCount + 1
      })),
      
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1)
      })),
      
      setNotifications: (notifications) => set({ 
        notifications,
        unreadNotificationsCount: notifications.filter(n => !n.is_read).length
      }),
      
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setTheme: (theme) => set({ theme }),
      
      logout: () => set({
        user: null,
        coach: null,
        club: null,
        finances: null,
        currentSeason: null,
        notifications: [],
        unreadNotificationsCount: 0
      }),
    }),
    {
      name: 'footmanager-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen 
      }), // Only persist UI state
    }
  )
);
