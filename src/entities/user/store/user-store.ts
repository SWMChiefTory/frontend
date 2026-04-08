import { create } from 'zustand';
import { User } from '../model/user';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  removeUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => {
    if (!(user instanceof User)) {
      throw new Error('User is not a User instance');
    }
    set({ user });
  },
  removeUser: () => set({ user: null }),
}));
