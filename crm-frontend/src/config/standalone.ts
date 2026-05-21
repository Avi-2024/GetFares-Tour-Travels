/** Frontend runs without backend when VITE_STANDALONE=true */
export const isStandaloneMode = (): boolean => {
  const flag = import.meta.env.VITE_STANDALONE;
  return flag === "true" || flag === "1";
};

export const STANDALONE_DEMO_EMAIL = "admin@demo.com";
export const STANDALONE_DEMO_PASSWORD = "demo1234";
export const STANDALONE_TOKEN = "standalone-demo-token";
