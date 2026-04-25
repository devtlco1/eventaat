export interface AuthLoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  area: string | null;
  isActive: boolean;
  address: string;
}
