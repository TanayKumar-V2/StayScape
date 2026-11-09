export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  isHost?: boolean;
  hostProfile?: {
    id: string;
    displayName: string;
    status: string;
  } | null;
  createdAt: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}
