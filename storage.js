import { loadCloudState, saveCloudState } from "./cloud-sync.js";

const DB_NAME = "life-os-thz-2026";
const STORE_NAME = "app-state";
const STATE_KEY = "state";
const FALLBACK_KEY = "life-os-thz-2026-state";

let dbPromise = null;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha no IndexedDB."));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () =>
      reject(transaction.error || new Error("Falha ao salvar no IndexedDB."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Transação abortada."));
  });
}

async function openDatabase() {
  if (!("indexedDB" in window)) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("Falha ao abrir IndexedDB."));
    });
  }

  return dbPromise;
}

async function readFromIndexedDB() {
  const database = await openDatabase();

  if (!database) {
    return null;
  }

  const transaction = database.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  return requestToPromise(store.get(STATE_KEY));
}

async function writeToIndexedDB(value) {
  const database = await openDatabase();

  if (!database) {
    return false;
  }

  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(value, STATE_KEY);
  await transactionToPromise(transaction);
  return true;
}

function readFromLocalStorage() {
  const raw = window.localStorage.getItem(FALLBACK_KEY);
  return raw ? JSON.parse(raw) : null;
}

function writeToLocalStorage(value) {
  window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(value));
}

export async function loadAppState(seedFactory) {
  let existing = null;

  try {
    existing = await readFromIndexedDB();
  } catch {
    existing = null;
  }

  existing = existing || readFromLocalStorage();

  if (existing) {
    const syncedState = await loadCloudState(existing);
    await writeToIndexedDB(syncedState).catch(() => false);
    writeToLocalStorage(syncedState);
    return syncedState;
  }

  const seededState = seedFactory();
  const savedState = await saveAppState(seededState);
  const syncedState = await loadCloudState(savedState);
  await writeToIndexedDB(syncedState).catch(() => false);
  writeToLocalStorage(syncedState);
  return syncedState;
}

export async function saveAppState(state) {
  const nextState = await saveCloudState(state);
  let savedToIndexedDB = false;

  try {
    savedToIndexedDB = await writeToIndexedDB(nextState);
  } catch {
    savedToIndexedDB = false;
  }

  if (!savedToIndexedDB) {
    writeToLocalStorage(nextState);
    return nextState;
  }

  writeToLocalStorage(nextState);
  return nextState;
}

export async function pullRemoteAppState(state) {
  const nextState = await loadCloudState(state);
  await writeToIndexedDB(nextState).catch(() => false);
  writeToLocalStorage(nextState);
  return nextState;
}

export async function resetAppState(seedFactory) {
  const seededState = seedFactory();
  return saveAppState(seededState);
}
