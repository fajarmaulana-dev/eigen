import appError from "../errors/apperror";
import { resMessage } from "../constants/http-response";
import { TBook } from "../models/book";
import { IBookRepository } from "../repositories/book";
import { TBooksDataResponse, convertToGetBooksResponse } from "../dtos/book";

export interface IBookService {
  addBook: (payloads: TBook) => Promise<void>;
  updateBook: (payloads: TBook) => Promise<void>;
  getAllBooks: (page: string, limit: string) => Promise<TBooksDataResponse>;
}

export class BookService implements IBookService {
  constructor(private bookRepository: IBookRepository) {
    this.bookRepository = bookRepository;
  }

  async getAllBooks(page: string, limit: string): Promise<TBooksDataResponse> {
    try {
      if (isNaN(+limit) || page.includes(".")) limit = "10";
      if (isNaN(+page)) page = "1";
      if (+page < 1 || page.includes("."))
        throw appError.badRequest(resMessage.pageIsNaturalNumber);

      const intPage = +page;
      const intLimit = +limit;
      const books = await this.bookRepository.findAll(intPage, intLimit);

      return {
        data: convertToGetBooksResponse(books.data),
        total_data: books.totalData,
        page: intPage,
        per_page: intLimit,
      };
    } catch (error) {
      if (error instanceof appError.AppError) throw error;
      throw appError.internalServer(error as Error);
    }
  }

  async addBook(payloads: TBook): Promise<void> {
    try {
      if (payloads.stock < 0) throw appError.badRequest(resMessage.stockIsWholeNumber);
      const existBook = await this.bookRepository.findOne(payloads.title, payloads.author);
      if (existBook) throw appError.conflict(resMessage.bookIsExist);
      const existCode = await this.bookRepository.findOneByCode(payloads.code);
      if (existCode) throw appError.conflict(resMessage.bookCodeIsUsed);

      await this.bookRepository.updateOne(payloads);
    } catch (error) {
      if (error instanceof appError.AppError) throw error;
      throw appError.internalServer(error as Error);
    }
  }

  async updateBook(payloads: TBook): Promise<void> {
    try {
      if (payloads.stock < 0) throw appError.badRequest(resMessage.stockIsWholeNumber);
      const existBook = await this.bookRepository.findOne(payloads.title, payloads.author);
      if (!existBook) throw appError.notFound(resMessage.bookIsNotFound);
      const existCode = await this.bookRepository.findOneByCode(payloads.code);
      if (existCode && (existCode.author !== payloads.author || existCode.title !== payloads.title))
        throw appError.conflict(resMessage.bookCodeIsUsed);

      await this.bookRepository.updateOne(payloads);
    } catch (error) {
      if (error instanceof appError.AppError) throw error;
      throw appError.internalServer(error as Error);
    }
  }
}
