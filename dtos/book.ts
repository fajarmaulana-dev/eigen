import { TBook } from "../models/book";

export type TGetBooksResponse = Omit<TBook, "created_at" | "updated_at" | "deleted_at">;

export type TBooksDataResponse = {
  data: TGetBooksResponse[];
  total_data: number;
  page: number;
  per_page: number;
};

export const convertToGetBooksResponse = (data: TBook[]): TGetBooksResponse[] =>
  data.map((d) => ({
    code: d.code,
    title: d.title,
    author: d.author,
    stock: d.stock,
  }));
