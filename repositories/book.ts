import { ClientSession } from "mongoose";
import { TBook, TBookModel } from "../models/book";

export interface IBookRepository {
  findOne: (title: string, author: string) => Promise<TBook | null>;
  findOneByCode: (code: string, session?: ClientSession) => Promise<TBook | null>;
  findAll: (page: number, limit: number) => Promise<{ totalData: number; data: TBook[] }>;
  updateOne: (book: TBook) => Promise<void>;
  updateStocks: (data: { code: string; stock: number }[], session?: ClientSession) => Promise<void>;
}

export class BookRepository implements IBookRepository {
  constructor(private bookModel: TBookModel) {
    this.bookModel = bookModel;
  }

  async findOne(title: string, author: string): Promise<TBook | null> {
    try {
      return await this.bookModel.findOne({ title, author });
    } catch (error) {
      throw error;
    }
  }

  async findOneByCode(code: string, session?: ClientSession): Promise<TBook | null> {
    try {
      if (session) return await this.bookModel.findOne({ code }).session(session);
      return await this.bookModel.findOne({ code });
    } catch (error) {
      throw error;
    }
  }

  async findAll(page: number, limit: number): Promise<{ totalData: number; data: TBook[] }> {
    const countQuery = this.bookModel.countDocuments({});
    const dataQuery = this.bookModel
      .find({})
      .skip((page - 1) * limit)
      .limit(limit);
    try {
      const [totalData, data] = await Promise.all([countQuery, dataQuery]);
      return { totalData, data };
    } catch (error) {
      throw error;
    }
  }

  async updateOne(book: TBook): Promise<void> {
    try {
      await this.bookModel.findOneAndUpdate(
        { title: book.title, author: book.author },
        {
          code: book.code,
          stock: book.stock,
          updated_at: new Date(),
          deleted_at: null,
        },
        { upsert: true, runValidators: false, new: true, lean: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateStocks(
    data: { code: string; stock: number }[],
    session?: ClientSession
  ): Promise<void> {
    const bulkUpdater = data.map(({ code, stock }) => ({
      updateOne: {
        filter: { code },
        update: { stock },
      },
    }));
    try {
      await this.bookModel.bulkWrite(bulkUpdater, { session });
    } catch (error) {
      throw error;
    }
  }
}
