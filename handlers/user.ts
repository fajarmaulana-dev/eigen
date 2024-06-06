import { NextFunction, Response } from "express";
import { IUserService } from "../services/user";
import { Request } from "../types/express";
import { resCode, resMessage } from "../constants/http-response";
import { TUserFilters } from "../services/auth";
import { TJwtPayloads } from "../utils/jwt-provider";

export class UserHandler {
  constructor(private userService: IUserService) {
    this.userService = userService;
  }

  getAllUsers = async (req: Request<any, TUserFilters>, res: Response, next: NextFunction) => {
    try {
      const data = await this.userService.getAllUsers(req.query);
      res.status(resCode.OK).json({
        message: resMessage.OK,
        data,
      });
    } catch (error) {
      return next(error);
    }
  };

  borrowBooks = async (
    req: Request<{ book_codes: string[] }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email }: TJwtPayloads = res.locals.user;
      const total_borrows = await this.userService.borrowBooks(req.body.book_codes, email);
      res.status(resCode.OK).json({
        message: resMessage.successBorrowBook,
        data: { total_borrows },
      });
    } catch (error) {
      return next(error);
    }
  };

  returnBooks = async (
    req: Request<{ book_codes: string[] }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email }: TJwtPayloads = res.locals.user;
      const data = await this.userService.returnBooks(req.body.book_codes, email);
      res.status(resCode.OK).json({
        message: resMessage.successReturnBook,
        data,
      });
    } catch (error) {
      return next(error);
    }
  };
}
