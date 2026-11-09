import { create } from 'zustand';

type KlipRequestType = 'auth' | 'executeContract';

type KlipRequestStore = {
  requestKey: string | null;
  requestType: KlipRequestType | null;
  setRequest: (key: string, type: KlipRequestType) => void;
  clearRequest: () => void;
};

const useKlipRequestStore = create<KlipRequestStore>((set) => ({
  requestKey: null,
  requestType: null,
  setRequest: (key: string, type: KlipRequestType) => {
    set({ requestKey: key, requestType: type });
  },
  clearRequest: () => {
    set({ requestKey: null, requestType: null });
  },
}));

export { useKlipRequestStore };
export type { KlipRequestType };
