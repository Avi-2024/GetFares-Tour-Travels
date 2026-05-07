import type User from "../../models/user.model";
import type { IStorage, IUserStorage } from "../../interfaces/IStorage.interface";
import { LocalStorageService } from "../../core/storage/local-storage.service";

class UserStorageService implements IUserStorage<User> {
  private static instance: UserStorageService;
  private readonly userKey = "user";
  private readonly storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  public static getInstance(
    storage: IStorage = LocalStorageService.getInstance(),
  ): UserStorageService {
    if (!UserStorageService.instance) {
      UserStorageService.instance = new UserStorageService(storage);
    }
    return UserStorageService.instance;
  }

  public saveUser(user: User): void {
    this.storage.setItem(this.userKey, JSON.stringify(user));
  }

  public loadUser(): User | null {
    const rawUser = this.storage.getItem(this.userKey);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      return null;
    }
  }

  public clearUser(): void {
    this.storage.removeItem(this.userKey);
  }
}

export { UserStorageService };
