import type { IStorage } from "../interfaces/IStorage.interface";

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  public key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

class StorageFactory {
  public static resolve(storageGetter: () => Storage): Storage {
    try {
      const storage = storageGetter();
      const testKey = "__storage_test__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return storage;
    } catch {
      return new MemoryStorage();
    }
  }
}

export abstract class BaseStorage implements IStorage {
  protected readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  public setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    this.storage.setItem(key, value);
  }

  public getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return this.storage.getItem(key);
  }

  public removeItem(key: string): void {
    if (typeof window === "undefined") return;
    this.storage.removeItem(key);
  }

  public clear(): void {
    if (typeof window === "undefined") return;
    this.storage.clear();
  }
}

export class LocalStorage extends BaseStorage {
  private static instance: LocalStorage;

  private constructor() {
    const resolvedStorage =
      typeof window !== "undefined"
        ? StorageFactory.resolve(() => window.localStorage)
        : new MemoryStorage();
    super(resolvedStorage);
  }

  public static getInstance(): LocalStorage {
    if (!LocalStorage.instance) {
      LocalStorage.instance = new LocalStorage();
    }
    return LocalStorage.instance;
  }
}

export class SessionStorage extends BaseStorage {
  private static instance: SessionStorage;

  private constructor() {
    const resolvedStorage =
      typeof window !== "undefined"
        ? StorageFactory.resolve(() => window.sessionStorage)
        : new MemoryStorage();
    super(resolvedStorage);
  }

  public static getInstance(): SessionStorage {
    if (!SessionStorage.instance) {
      SessionStorage.instance = new SessionStorage();
    }
    return SessionStorage.instance;
  }
}
