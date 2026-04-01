abstract class ApiConfig {
  static baseURL: string = "https://localhost:3000";
  static endpoints = {
    login: "/auth/login",
    logout: "/auth/logout",
  };
}

export default ApiConfig;
