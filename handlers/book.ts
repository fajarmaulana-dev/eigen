import { NextFunction, Response } from "express";
import { Request } from "../types/express";
import { TBook } from "../models/book";
import { IBookService } from "../services/book";
import { resCode, resMessage } from "../constants/http-response";

export class BookHandler {
  constructor(private bookService: IBookService) {
    this.bookService = bookService;
  }

  getAllBooks = async (
    req: Request<any, { page: string; limit: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page, limit } = req.query;
      const data = await this.bookService.getAllBooks(page, limit);
      res.status(resCode.OK).json({
        message: resMessage.OK,
        data,
      });
    } catch (error) {
      return next(error);
    }
  };

  addBook = async (req: Request<TBook>, res: Response, next: NextFunction) => {
    try {
      await this.bookService.addBook(req.body);
      res.status(resCode.Created).json({
        message: resMessage.successAddBook,
        data: req.body,
      });
    } catch (error) {
      return next(error);
    }
  };

  updateBook = async (req: Request<TBook>, res: Response, next: NextFunction) => {
    try {
      await this.bookService.updateBook(req.body);
      res.status(resCode.OK).json({
        message: resMessage.successUpdateBook,
        data: req.body,
      });
    } catch (error) {
      return next(error);
    }
  };
}
