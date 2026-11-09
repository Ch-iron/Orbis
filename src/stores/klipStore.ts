import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type KlipStore = {
  klipAddress: string | null;
  setKlipAddress: (address: string | null) => void;
};

const useKlipStore = create<KlipStore>()(
  persist(
    (set) => ({
      klipAddress: null,
      setKlipAddress: (address: string | null) => {
        set({ klipAddress: address });
      },
    }),
    {
      name: 'orbis-klip',
    },
  ),
);

export { useKlipStore };
