import { BaseStorage } from "./base-storage";
import { MemoryStorage } from "./memory-storage";
import { StorageFactory } from "./storage-factory";

class SessionStorageService extends BaseStorage {
  private static instance: SessionStorageService;

  private constructor(storageFactory: StorageFactory = new StorageFactory()) {
    const resolvedStorage =
      typeof window !== "undefined" ?
        storageFactory.resolve(() => window.sessionStorage)
      : new MemoryStorage();
    super(resolvedStorage);
  }

  public static getInstance(): SessionStorageService {
    if (!SessionStorageService.instance) {
      SessionStorageService.instance = new SessionStorageService();
    }
    return SessionStorageService.instance;
  }
}

export { SessionStorageService };
