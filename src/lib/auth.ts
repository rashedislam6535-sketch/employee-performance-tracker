import { User, EmployeeProfile } from "@/types";

export interface AuthSession {
  user: User;
  employee: EmployeeProfile;
  token: string;
}
