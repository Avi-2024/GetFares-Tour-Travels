import { BaseStorage } from "./base-storage";
import { MemoryStorage } from "./memory-storage";
import { StorageFactory } from "./storage-factory";

class LocalStorageService extends BaseStorage {
  private static instance: LocalStorageService;

  private constructor(storageFactory: StorageFactory = new StorageFactory()) {
    const resolvedStorage =
      typeof window !== "undefined" ?
        storageFactory.resolve(() => window.localStorage)
      : new MemoryStorage();
    super(resolvedStorage);
  }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }
}

export { LocalStorageService };
