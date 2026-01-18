export interface User {
  userId: number;
  email: string;
  mobile: string | null;
  accountStatus: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  gender: string | null;
  dob: string | null;
  roles: string[];
  createdAt: string;
}

