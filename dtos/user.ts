import { TUser, TUserRole } from "../models/user";

export type TGetUsersResponse = {
  name: string;
  email: string;
  code: string;
  borrowed_books?: number;
};

export type TUserFilters = {
  role: string;
  page: string;
  limit: string;
};

export type TUsersDataResponse = {
  data: TGetUsersResponse[];
  total_data: number;
  page: number;
  per_page: number;
};

export const convertToGetUsersResponse = (data: TUser[], role: string): TGetUsersResponse[] =>
  data.map((d) => {
    const userByRole = d.roles.find((r) => r.name == role) as TUserRole;
    const dataByRole: TGetUsersResponse = {
      code: d.code,
      email: d.email,
      name: userByRole.additions.get("name"),
    };
    const borrowed_books = userByRole.additions.get("borrowed_book_codes");
    if (borrowed_books) dataByRole.borrowed_books = borrowed_books.length;
    return dataByRole;
  });
