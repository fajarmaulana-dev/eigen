import { Router } from "express";
import { TConfig } from "../utils/config";
import { Hasher } from "../utils/hasher";
import { JwtProvider } from "../utils/jwt-provider";
import { Mailer } from "../utils/mailer";
import { RoleRepository } from "../repositories/role";
import role from "../models/role";
import { UserRepository } from "../repositories/user";
import user from "../models/user";
import resetpasswordToken from "../models/resetpassword-token";
import { AuthService } from "../services/auth";
import { AuthHandler } from "../handlers/auth";
import { Validator } from "../middlewares/validator";
import { Authenticator } from "../middlewares/authenticator";
import { RouteRepository } from "../repositories/route";
import route from "../models/route";
import { UserHandler } from "../handlers/user";
import { UserService } from "../services/user";
import { BookHandler } from "../handlers/book";
import { BookRepository } from "../repositories/book";
import book from "../models/book";
import { BookService } from "../services/book";

export class Routes {
  config: TConfig;
  constructor(config: TConfig) {
    this.config = config;
  }

  createRouter() {
    const router = Router();

    const hasher = new Hasher(this.config);
    const jwtProvider = new JwtProvider(this.config);
    const mailer = new Mailer(this.config);

    const roleRepository = new RoleRepository(role);
    const routeRepository = new RouteRepository(route);
    const userRepository = new UserRepository(user, resetpasswordToken);
    const bookRepository = new BookRepository(book);

    const authService = new AuthService(
      userRepository,
      roleRepository,
      routeRepository,
      hasher,
      jwtProvider,
      mailer,
      this.config
    );
    const userService = new UserService(userRepository, bookRepository);
    const bookService = new BookService(bookRepository);

    const authHandler = new AuthHandler(authService, this.config);
    const userHandler = new UserHandler(userService);
    const bookHandler = new BookHandler(bookService);

    const authenticator = new Authenticator(userRepository, routeRepository, jwtProvider);
    const ve = new Validator(roleRepository);

    return {
      router,
      authenticator,
      ve,
      authHandler,
      userHandler,
      bookHandler,
    };
  }

  authRoute() {
    const r = this.createRouter();

    r.router.post("/register", r.ve.register, r.authHandler.register);
    r.router.patch("/resend-mailtoken", r.ve.forgotPassword, r.authHandler.resendMailToken);
    r.router.patch("/verify", r.ve.verifyEmail, r.authHandler.verifyEmail);
    r.router.post("/login", r.ve.login, r.authHandler.login);
    r.router.post("/refresh-token", r.authHandler.refreshToken);
    r.router.post("/forgot-password", r.ve.forgotPassword, r.authHandler.mailForgotPassword);
    r.router.patch("/reset-password", r.ve.resetPassword, r.authHandler.resetPassword);
    r.router.post("/logout", r.authHandler.logout);
    // r.router.post("/role", r.ve.role, r.authHandler.addRole);

    r.router.use(r.authenticator.verify);
    r.router.post("/verify-password", r.ve.verifyPassword, r.authHandler.verifyPassword);
    r.router.patch("/change-password", r.ve.changePassword, r.authHandler.changePassword);
    r.router.post("/role", r.ve.role, r.authHandler.addRole);
    r.router.patch("/role", r.ve.role, r.authHandler.updateRole);
    r.router.post("/route", r.ve.route, r.authHandler.addRoute);
    r.router.patch("/route", r.ve.route, r.authHandler.updateRoute);

    return r.router;
  }

  userRoute() {
    const r = this.createRouter();

    r.router.use(r.authenticator.verify);
    r.router.get("/", r.userHandler.getAllUsers);
    r.router.patch("/borrow-books", r.ve.bookRecord, r.userHandler.borrowBooks);
    r.router.patch("/return-books", r.ve.bookRecord, r.userHandler.returnBooks);

    return r.router;
  }

  bookRoute() {
    const r = this.createRouter();

    r.router.get("/", r.bookHandler.getAllBooks);

    r.router.use(r.authenticator.verify);
    r.router.post("/", r.ve.book, r.bookHandler.addBook);
    r.router.patch("/", r.ve.book, r.bookHandler.updateBook);
    return r.router;
  }
}
