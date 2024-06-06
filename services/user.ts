import { resMessage } from "../constants/http-response";
import appError from "../errors/apperror";
import { IUserRepository } from "../repositories/user";
import { TUserFilters, TUsersDataResponse, convertToGetUsersResponse } from "../dtos/user";
import { IBookRepository } from "../repositories/book";
import { startSession } from "mongoose";
import { TUserRole } from "../models/user";
import { cRole } from "../constants/auth";
import { cBook } from "../constants/book";

type TBorrowed = { code: string; created_at: Date };

export interface IUserService {
  getAllUsers: (payloads: TUserFilters) => Promise<TUsersDataResponse>;
  borrowBooks: (bookCodes: string[], email: string) => Promise<number>;
  returnBooks: (
    bookCodes: string[],
    email: string
  ) => Promise<{ still_borrowed: number; with_penalty: boolean }>;
}

export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository, private bookRepository: IBookRepository) {
    this.userRepository = userRepository;
    this.bookRepository = bookRepository;
  }

  async getAllUsers(payloads: TUserFilters): Promise<TUsersDataResponse> {
    try {
      let { role, page, limit } = payloads;
      if (!role || role == "") role = cRole.user;
      if (isNaN(+limit) || page.includes(".")) limit = "10";
      if (isNaN(+page)) page = "1";
      if (+page < 1 || page.includes("."))
        throw appError.badRequest(resMessage.pageIsNaturalNumber);

      const intPage = +page;
      const intLimit = +limit;
      const users = await this.userRepository.findAll(role, intPage, intLimit);

      return {
        data: convertToGetUsersResponse(users.data, role),
        total_data: users.totalData,
        page: intPage,
        per_page: intLimit,
      };
    } catch (error) {
      if (error instanceof appError.AppError) throw error;
      throw appError.internalServer(error as Error);
    }
  }

  async borrowBooks(bookCodes: string[], email: string): Promise<number> {
    const session = await startSession();
    try {
      bookCodes = [...new Set(bookCodes)];
      let totalBorrows = 0;

      await session.withTransaction(async () => {
        const stocks: number[] = [];
        for (const code of bookCodes) {
          const book = await this.bookRepository.findOneByCode(code, session);
          if (!book) throw appError.notFound(resMessage.bookIsNotFound);
          if (book.stock == 0) throw appError.notFound(resMessage.bookIsOutOfStock);
          stocks.push(book.stock);
        }

        const user = await this.userRepository.findOneByEmail(email, session);
        const userRole = user!.roles.find((r) => r.name == cRole.user) as TUserRole;
        const currentBorrows: TBorrowed[] = userRole.additions.get("borrowed_book_codes");
        const lateReturn = currentBorrows.find(
          (b) => new Date().getTime() - b.created_at.getTime() > cBook.maxBorrowTime
        );
        const penalizedAt: Date | null = userRole.additions.get("penalized_at");
        const isPenalized =
          penalizedAt && new Date().getTime() - penalizedAt.getTime() <= cBook.maxPenaltyTime;

        if (isPenalized || lateReturn) throw appError.forbidden(resMessage.penalizedUser);
        if (currentBorrows.length + bookCodes.length > cBook.maxBorrow)
          throw appError.badRequest(resMessage.tooManyBorrow);
        if (currentBorrows.some((b) => bookCodes.includes(b.code)))
          throw appError.conflict(resMessage.hasBeenBorrow);

        const newStocks = bookCodes.map((code, i) => ({ code, stock: stocks[i] - 1 }));
        await this.bookRepository.updateStocks(newStocks, session);

        const newBorrows = [
          ...currentBorrows,
          ...bookCodes.map((code) => ({ code, created_at: new Date() })),
        ];
        const newRoles = user!.roles.map((r) => {
          if (r.name == cRole.user) {
            r.additions.set("borrowed_book_codes", newBorrows);
            r.additions.set("penalized_at", null);
            return r;
          }
          return r;
        });

        await this.userRepository.updateAdditions(email, newRoles, session);
        totalBorrows = newBorrows.length;
      });
      return totalBorrows;
    } catch (error) {
      if (error instanceof appError.AppError) throw error;
      throw appError.internalServer(error as Error);
    } finally {
      session.endSession();
    }
  }

  async returnBooks(
    bookCodes: string[],
    email: string
  ): Promise<{ still_borrowed: number; with_penalty: boolean }> {
    try {
      const stocks: number[] = [];
      for (const code of bookCodes) {
        const book = await this.bookRepository.findOneByCode(code);
        if (!book) throw appError.notFound(resMessage.bookIsNotFound);
        stocks.push(book.stock);
      }

      const user = await this.userRepository.findOneByEmail(email);
      const userRole = user!.roles.find((r) => r.name == cRole.user) as TUserRole;
      const currentBorrows: TBorrowed[] = userRole.additions.get("borrowed_book_codes");
      const lateReturn = currentBorrows.find(
        (b) => new Date().getTime() - b.created_at.getTime() > cBook.maxBorrowTime
      );

      if (bookCodes.some((c) => !currentBorrows.map((b) => b.code).includes(c)))
        throw appError.badRequest(resMessage.hasNotBeenBorrow);
      const newStocks = bookCodes.map((code, i) => ({ code, stock: stocks[i] + 1 }));
      await this.bookRepository.updateStocks(newStocks);

      let penalized_at = null;
      const newBorrows = currentBorrows.filter((b) => !bookCodes.includes(b.code));
      const newRoles = user!.roles.map((r) => {
        if (r.name == cRole.user) {
          r.additions.set("borrowed_book_codes", newBorrows);
          if (lateReturn) {
            penalized_at = new Date();
            r.additions.set("penalized_at", penalized_at);
          }
          return r;
        }
        return r;
      });

      await this.userRepository.updateAdditions(email, newRoles);
      return {
        still_borrowed: newBorrows.length,
        with_penalty: penalized_at !== null,
      };
    } catch (error) {
      if (error instanceof appError.AppError) throw error;
      throw appError.internalServer(error as Error);
    }
  }
}
