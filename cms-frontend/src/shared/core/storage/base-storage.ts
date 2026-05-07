import type { IStorage } from "../../interfaces/IStorage.interface";

abstract class BaseStorage implements IStorage {
  protected readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  public setItem(key: string, value: string): void {
    if (typeof window === "undefined") {
      return;
    }
    this.storage.setItem(key, value);
  }

  public getItem(key: string): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return this.storage.getItem(key);
  }

  public removeItem(key: string): void {
    if (typeof window === "undefined") {
      return;
    }
    this.storage.removeItem(key);
  }

  public clear(): void {
    if (typeof window === "undefined") {
      return;
    }
    this.storage.clear();
  }
}

export { BaseStorage };
