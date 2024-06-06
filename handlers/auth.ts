import { CookieOptions, NextFunction, Response } from "express";
import { IAuthService } from "../services/auth";
import {
  TForgotPasswordRequest,
  TLoginRequest,
  TRegisterRequest,
  TResetPasswordRequest,
  TRoleRequest,
  TRouteRequest,
} from "../dtos/auth";
import { Request } from "../types/express";
import { resCode, resMessage } from "../constants/http-response";
import { TConfig } from "../utils/config";
import { TJwtPayloads } from "../utils/jwt-provider";
import { cEnv } from "../constants/env";

type ResRoleToken = { max_date: string; role: string; token?: string };

export class AuthHandler {
  private accessCookie: CookieOptions;
  private refreshCookie: CookieOptions;
  private env: string;

  constructor(private authService: IAuthService, config: TConfig) {
    this.authService = authService;
    this.accessCookie = {
      expires: new Date(Date.now() + config.accessExp),
      maxAge: config.accessExp,
      httpOnly: true,
      sameSite: config.env === cEnv.release ? "none" : "lax",
      secure: config.env === cEnv.release,
    };
    this.refreshCookie = { ...this.accessCookie };
    this.refreshCookie.expires = new Date(Date.now() + config.refreshExp);
    this.refreshCookie.maxAge = config.refreshExp;
    this.env = config.env;
  }

  register = async (req: Request<TRegisterRequest>, res: Response, next: NextFunction) => {
    try {
      const token = await this.authService.register(req.body);
      const message = token ? resMessage.successRegister : resMessage.successRegisterNewRole;
      const code = token ? resCode.Created : resCode.OK;
      if (token && this.env !== cEnv.release) {
        res.status(code).json({ message, data: { token } });
        return;
      }
      res.status(code).json({ message });
    } catch (error) {
      return next(error);
    }
  };

  verifyEmail = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
    try {
      await this.authService.verifyEmail(req.body.token);
      res.status(resCode.OK).json({ message: resMessage.successVerifyEmail });
    } catch (error) {
      return next(error);
    }
  };

  resendMailToken = async (
    req: Request<{ email: string; role: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, role } = req.body;
      const data = await this.authService.resendMailToken(email);
      const response = {
        message: resMessage.successRegister,
        data: { max_date: data.max_date, role } as ResRoleToken,
      };
      if (this.env !== cEnv.release) response.data.token = data.token;
      res.status(resCode.OK).json(response);
    } catch (error) {
      return next(error);
    }
  };

  login = async (req: Request<TLoginRequest>, res: Response, next: NextFunction) => {
    try {
      const { user, token } = await this.authService.login(req.body);
      res.cookie("access_token", token.accessToken, this.accessCookie);
      res.cookie("refresh_token", token.refreshToken, this.refreshCookie);
      res.status(resCode.OK).json({ message: resMessage.successLogin, data: user });
    } catch (error) {
      return next(error);
    }
  };

  refreshToken = async (
    req: Request<any, any, any, { refresh_token: string | undefined }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = await this.authService.refreshToken(req.cookies.refresh_token);
      res.cookie("access_token", token.accessToken, this.accessCookie);
      res.status(resCode.OK).json({ message: resMessage.successRefreshToken });
    } catch (error) {
      return next(error);
    }
  };

  verifyPassword = async (
    req: Request<{ password: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { password } = req.body;
      const { email, role }: TJwtPayloads = res.locals.user;
      await this.authService.verifyPassword({ password, email, role });
      res.status(resCode.OK).json({ message: resMessage.successVerifyPassword });
    } catch (error) {
      return next(error);
    }
  };

  changePassword = async (
    req: Request<{ password: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { password } = req.body;
      const { email, role }: TJwtPayloads = res.locals.user;
      await this.authService.changePassword({ password, email, role });
      res.status(resCode.OK).json({ message: resMessage.successChangePassword });
    } catch (error) {
      return next(error);
    }
  };

  mailForgotPassword = async (
    req: Request<TForgotPasswordRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.authService.mailForgotPassword(req.body);
      const response = {
        message: resMessage.successRegister,
        data: { max_date: data.max_date, role: req.body.role } as ResRoleToken,
      };
      if (this.env !== cEnv.release) response.data.token = data.token;
      res.status(resCode.OK).json(response);
    } catch (error) {
      return next(error);
    }
  };

  resetPassword = async (
    req: Request<TResetPasswordRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await this.authService.resetPassword(req.body);
      res.status(resCode.OK).json({ message: resMessage.successResetPassword });
    } catch (error) {
      return next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    res.cookie("access_token", "", { maxAge: -1 });
    res.cookie("refresh_token", "", { maxAge: -1 });
    res.status(resCode.OK).json({ message: resMessage.successLogout });
  };

  addRole = async (req: Request<TRoleRequest>, res: Response, next: NextFunction) => {
    try {
      const role = await this.authService.addRole(req.body);
      res.status(resCode.Created).json({
        message: resMessage.successAddRole,
        data: role,
      });
    } catch (error) {
      return next(error);
    }
  };

  updateRole = async (req: Request<TRoleRequest>, res: Response, next: NextFunction) => {
    try {
      const role = await this.authService.updateRole(req.body);
      res.status(resCode.OK).json({
        message: resMessage.successUpdateRole,
        data: role,
      });
    } catch (error) {
      return next(error);
    }
  };

  addRoute = async (req: Request<TRouteRequest>, res: Response, next: NextFunction) => {
    try {
      const route = await this.authService.addRoute(req.body);
      res.status(resCode.Created).json({
        message: resMessage.successAddRoute,
        data: route,
      });
    } catch (error) {
      return next(error);
    }
  };

  updateRoute = async (req: Request<TRouteRequest>, res: Response, next: NextFunction) => {
    try {
      const route = await this.authService.updateRoute(req.body);
      res.status(resCode.OK).json({
        message: resMessage.successUpdateRoute,
        data: route,
      });
    } catch (error) {
      return next(error);
    }
  };
}
