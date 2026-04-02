import { IStorage } from "../interfaces/IStorage.interface";

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
    super(typeof window !== "undefined" ? window.localStorage : {} as Storage);
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
    super(typeof window !== "undefined" ? window.sessionStorage : {} as Storage);
  }

  public static getInstance(): SessionStorage {
    if (!SessionStorage.instance) {
      SessionStorage.instance = new SessionStorage();
    }
    return SessionStorage.instance;
  }
}
