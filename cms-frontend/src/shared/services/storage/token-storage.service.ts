import type { IStorage, ITokenStorage } from "../../interfaces/IStorage.interface";
import { LocalStorageService } from "../../core/storage/local-storage.service";

class TokenStorageService implements ITokenStorage {
  private static instance: TokenStorageService;
  private readonly tokenKey = "token";
  private readonly storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  public static getInstance(
    storage: IStorage = LocalStorageService.getInstance(),
  ): TokenStorageService {
    if (!TokenStorageService.instance) {
      TokenStorageService.instance = new TokenStorageService(storage);
    }
    return TokenStorageService.instance;
  }

  public saveToken(token: string): void {
    this.storage.setItem(this.tokenKey, token);
  }

  public loadToken(): string | null {
    return this.storage.getItem(this.tokenKey);
  }

  public clearToken(): void {
    this.storage.removeItem(this.tokenKey);
  }
}

export { TokenStorageService };
