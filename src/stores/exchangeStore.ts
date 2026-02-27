import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';

type ExchangeAddress = {
  id: string;
  name: string;
  address: string;
};

type ExchangeStore = {
  addresses: ExchangeAddress[];
  addAddress: (name: string, address: string) => void;
  removeAddress: (id: string) => void;
  updateAddress: (id: string, name: string, address: string) => void;
};

// SSR-safe storage that falls back to noop on the server
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(name);
  },
};

const useExchangeStore = create<ExchangeStore>()(
  persist(
    (set) => ({
      addresses: [],
      addAddress: (name: string, address: string) => {
        set((state) => ({
          addresses: [
            ...state.addresses,
            { id: crypto.randomUUID(), name, address },
          ],
        }));
      },
      removeAddress: (id: string) => {
        set((state) => ({
          addresses: state.addresses.filter((addr) => addr.id !== id),
        }));
      },
      updateAddress: (id: string, name: string, address: string) => {
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id ? { ...addr, name, address } : addr,
          ),
        }));
      },
    }),
    {
      name: 'exchange-addresses',
      storage: {
        getItem: (name) => {
          const value = safeStorage.getItem(name) as string | null;
          if (!value) {
            return null;
          }
          return JSON.parse(value);
        },
        setItem: (name, value) => {
          safeStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          safeStorage.removeItem(name);
        },
      },
    },
  ),
);

export { useExchangeStore };
export type { ExchangeAddress, ExchangeStore };
