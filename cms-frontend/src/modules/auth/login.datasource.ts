class LoginDatasource {
  public async login(
    username: string,
    password: string,
  ): Promise<boolean | string> {
    // TODO Simulate API call — replace with real auth logic
    await new Promise((r) => setTimeout(r, 1600));
    if (username !== "admin" || password !== "password") {
      return "Invalid username or password.";
    }
    localStorage.setItem("token", "fake-jwt-token");
    localStorage.setItem("user", JSON.stringify({ username }));

    return true;
  }
  public async logout(): Promise<void> {}
}

export default new LoginDatasource();
