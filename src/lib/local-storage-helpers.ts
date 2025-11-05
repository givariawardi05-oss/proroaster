"use client";

import type { GlobalData } from './definitions';

const DB_KEY = 'blackhorse_roastery_db';

const getInitialDbState = (): Omit<GlobalData, 'nextIds' | 'currentBalance'> => ({
  warehouseData: [],
  roastingBatches: [],
  roastedInventory: [],
  storeInventory: [],
  salesInvoices: [],
  purchaseInvoices: [],
  transactions: [],
  assetsData: [],
  settings: {
    modal_awal: 0,
    company_name: 'BlackHorse Roastery',
    stock_low_limit: 10,
  },
});

// This function can only be called on the client
export async function getAllData(): Promise<Omit<GlobalData, 'nextIds' | 'currentBalance'>> {
  if (typeof window === 'undefined') {
    return getInitialDbState();
  }

  try {
    const localData = window.localStorage.getItem(DB_KEY);
    if (localData) {
      return JSON.parse(localData);
    } else {
      const initialState = getInitialDbState();
      window.localStorage.setItem(DB_KEY, JSON.stringify(initialState));
      return initialState;
    }
  } catch (error) {
    console.error("Failed to read from localStorage", error);
    return getInitialDbState();
  }
}

// This function can only be called on the client
export async function writeAllData(data: Omit<GlobalData, 'nextIds' | 'currentBalance'>): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const dataString = JSON.stringify(data);
    window.localStorage.setItem(DB_KEY, dataString);
  } catch (error) {
    console.error("Failed to write to localStorage", error);
  }
}
