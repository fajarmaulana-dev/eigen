import { NextFunction, Response } from "express";
import { Request } from "../types/express";
import appError from "../errors/apperror";
import { resMessage } from "../constants/http-response";
import { IJwtProvider } from "../utils/jwt-provider";
import { IUserRepository } from "../repositories/user";
import { cRole } from "../constants/auth";
import { IRouteRepository } from "../repositories/route";

export class Authenticator {
  constructor(
    private userRepository: IUserRepository,
    private routeRepository: IRouteRepository,
    private jwtProvider: IJwtProvider
  ) {
    this.jwtProvider = jwtProvider;
    this.userRepository = userRepository;
    this.routeRepository = routeRepository;
  }

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access_token = req.cookies.access_token;
      if (!access_token) return next(appError.forbidden(resMessage.noAccessToken));
      const user = await this.jwtProvider.verify(access_token, true);
      if (!user) return next(appError.forbidden(resMessage.invalidToken));

      if (user.role !== cRole.admin) {
        let path = req.originalUrl;
        const searchIndex = path.indexOf("?");
        if (searchIndex !== -1) path = path.slice(0, searchIndex);
        const route = await this.routeRepository.findOneByName(path);
        if (!route) return next(appError.notFound(resMessage.serverRouteIsNotFound));
        const restriction = route.restrictions.find((r) => r.method == req.method);
        if (restriction && !restriction.roles.includes(user.role))
          return next(appError.forbidden(resMessage.restrictedRoute));
      }

      const exist = await this.userRepository.findOneByEmail(user.email);
      if (!exist) return next(appError.notFound(resMessage.userIsNotFound));
      res.locals.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
