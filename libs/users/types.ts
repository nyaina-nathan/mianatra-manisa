export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  username: string;
  created_at: Date | null;
};

export type User = {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  username: string;
};

export type LoginInput = {
  email: string;
  password: string;
};
