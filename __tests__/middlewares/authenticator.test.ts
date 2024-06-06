import { NextFunction, Response } from "express";
import { Request } from "../../types/express";
import { faker } from "@faker-js/faker";
import { resCode, resMessage } from "../../constants/http-response";
import appError from "../../errors/apperror";
import { Mock, mock } from "ts-jest-mocker";
import { Authenticator } from "../../middlewares/authenticator";
import { UserRepository } from "../../repositories/user";
import { RouteRepository } from "../../repositories/route";
import { JwtProvider } from "../../utils/jwt-provider";
import { TRoute } from "../../models/route";
import { cRole } from "../../constants/auth";

jest.mock("../../repositories/user.ts");
jest.mock("../../repositories/route.ts");
jest.mock("../../utils/jwt-provider.ts");

describe("Authenticator", () => {
  let authenticator: Authenticator;
  let userRepository: Mock<UserRepository>;
  let routeRepository: Mock<RouteRepository>;
  let jwtProvider: Mock<JwtProvider>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    userRepository = mock(UserRepository);
    routeRepository = mock(RouteRepository);
    jwtProvider = mock(JwtProvider);
    authenticator = new Authenticator(userRepository, routeRepository, jwtProvider);

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      locals: {},
    };
    mockNext = jest.fn();
  });

  const userReq = {
    code: faker.string.alphanumeric(),
    email: faker.internet.email(),
    verify_email_token: null,
    roles: [
      { name: cRole.admin, additions: new Map() },
      { name: cRole.user, additions: new Map() },
    ],
  };

  describe("verify", () => {
    it("should call next with forbidden error when no access token provided", async () => {
      mockRequest.cookies = {};

      await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError.forbidden(resMessage.noAccessToken));
    });

    it("should call next with forbidden error when access is invalid", async () => {
      mockRequest.cookies = { access_token: "invalid_token" };
      jwtProvider.verify.mockResolvedValueOnce(null);

      await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError.forbidden(resMessage.invalidToken));
    });

    it("should call next with forbidden error when user role does not have access to the route", async () => {
      mockRequest.cookies = { access_token: "valid_token" };
      mockRequest.originalUrl = "/";
      mockRequest.method = "GET";
      const user = { email: faker.internet.email(), role: cRole.user };
      jwtProvider.verify.mockResolvedValueOnce(user);
      const route = {
        name: "/",
        restrictions: [{ method: "GET", roles: [cRole.admin] }],
      } as TRoute;
      routeRepository.findOneByName.mockResolvedValueOnce(route);

      await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError.forbidden(resMessage.restrictedRoute));
    });

    it("should call next with notFound error when user does not exist", async () => {
      mockRequest.cookies = { access_token: "valid_token" };
      mockRequest.originalUrl = "/";
      mockRequest.method = "GET";
      const user = { email: faker.internet.email(), role: cRole.user };
      jwtProvider.verify.mockResolvedValueOnce(user);
      const route = { name: "/", restrictions: [{ method: "GET", roles: [cRole.user] }] } as TRoute;
      routeRepository.findOneByName.mockResolvedValueOnce(route);
      userRepository.findOneByEmail.mockResolvedValueOnce(null);

      await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError.notFound(resMessage.userIsNotFound));
    });

    it("should call next without error when user is admin and has access to the route", async () => {
      mockRequest.cookies = { access_token: "valid_token" };
      const user = { email: userReq.email, role: cRole.admin };
      jwtProvider.verify.mockResolvedValueOnce(user);
      userRepository.findOneByEmail.mockResolvedValueOnce(userReq);

      await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should call next without error when user is not admin but has access to the route", async () => {
      mockRequest.cookies = { access_token: "valid_token" };
      mockRequest.originalUrl = "/";
      mockRequest.method = "GET";
      const user = { email: userReq.email, role: cRole.user };
      jwtProvider.verify.mockResolvedValueOnce(user);
      const route = { name: "/", restrictions: [{ method: "GET", roles: [cRole.user] }] } as TRoute;
      routeRepository.findOneByName.mockResolvedValueOnce(route);
      userRepository.findOneByEmail.mockResolvedValueOnce(userReq);

      await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should call next with error when any unhandled error from repository or util", async () => {
      mockRequest.cookies = { access_token: "valid_token" };
      jwtProvider.verify.mockRejectedValueOnce(new Error("error"));

      try {
        await authenticator.verify(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(mockNext).toHaveBeenCalledWith(error);
      }
    });
  });
});
