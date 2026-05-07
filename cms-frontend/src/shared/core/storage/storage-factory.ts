import { MemoryStorage } from "./memory-storage";

class StorageFactory {
  public resolve(storageGetter: () => Storage): Storage {
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

export { StorageFactory };
