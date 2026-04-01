import ApiConfig from "../core/api.config";
import type User from "../models/user.model";
import apiService from "./api.service";
import storageService from "./storage.service";

class AuthService {
  public async login(
    username: string,
    password: string,
  ): Promise<boolean | string> {
    const response: User = await apiService.get(ApiConfig.endpoints.login, {
      body: { username: username, password: password },
    });

    console.log(response);
    storageService.user._setUser(response);

    return true;
  }

  public async logout(): Promise<void> {
    localStorage.removeItem("token");
  }
}

export default new AuthService();
