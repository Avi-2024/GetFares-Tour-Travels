export default interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  roleId: string | null;
  isActive: boolean;
  token?: string;
}
