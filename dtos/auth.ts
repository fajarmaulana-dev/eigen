import { TUser, TUserRole } from "../models/user";
import { TRole } from "../models/role";
import { TRoute } from "../models/route";

export type TRegisterRequest = Pick<TUser, "email"> & {
  additions: Record<string, any>;
  role: string;
};

export type TForgotPasswordRequest = { email: string; role: string };
export type TLoginRequest = TForgotPasswordRequest & { password: string };
export type TLoginResponse = Pick<TUser, "email"> & {
  additions: Record<string, any>;
  role: string;
  limits: TRole["limits"];
};

export type TResetPasswordRequest = TLoginRequest & {
  token: string | null;
};

export const convertUserToLoginResponse = (
  user: TUser,
  role: TUserRole,
  limits: TRole["limits"]
): TLoginResponse => {
  role.additions.delete("password");
  return {
    email: user.email,
    role: role.name,
    additions: Object.fromEntries(role.additions),
    limits,
  };
};

export type TRoleRequest = Omit<TRole, "created_at" | "updated_at" | "deleted_at">;
export type TRouteRequest = Pick<TRoute, "name" | "restrictions">;
