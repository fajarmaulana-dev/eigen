import { faker } from "@faker-js/faker";
import { RoleRepository } from "../../repositories/role";
import { RouteRepository } from "../../repositories/route";
import { UserRepository } from "../../repositories/user";
import { AuthService } from "../../services/auth";
import { TConfig, configInit } from "../../utils/config";
import { Mock, mock } from "ts-jest-mocker";
import { Hasher } from "../../utils/hasher";
import { JwtProvider } from "../../utils/jwt-provider";
import { Mailer } from "../../utils/mailer";
import { cRole } from "../../constants/auth";
import { resMessage } from "../../constants/http-response";
import appError from "../../errors/apperror";
import { TUser } from "../../models/user";
import { TResetPassword } from "../../models/resetpassword-token";
import { TRole } from "../../models/role";
import { TRoute } from "../../models/route";

jest.mock("../../repositories/user.ts");
jest.mock("../../repositories/role.ts");
jest.mock("../../repositories/route.ts");

describe("Auth Service", () => {
  let authService: AuthService;
  let userRepository: Mock<UserRepository>;
  let roleRepository: Mock<RoleRepository>;
  let routeRepository: Mock<RouteRepository>;
  let hasher: Mock<Hasher>;
  let jwtProvider: Mock<JwtProvider>;
  let mailer: Mock<Mailer>;
  const config = configInit() as TConfig;

  beforeEach(() => {
    userRepository = mock(UserRepository);
    roleRepository = mock(RoleRepository);
    routeRepository = mock(RouteRepository);
    hasher = mock(Hasher);
    jwtProvider = mock(JwtProvider);
    mailer = mock(Mailer);
    authService = new AuthService(
      userRepository,
      roleRepository,
      routeRepository,
      hasher,
      jwtProvider,
      mailer,
      config
    );
  });

  const email = faker.internet.email();
  const password = faker.internet.password();
  const role = cRole.user;
  const jwts = { accessToken: faker.string.sample(125), refreshToken: faker.string.sample(125) };

  const mockRole = (param?: { r?: string; a?: boolean; w?: string; l?: TRole["limits"] }) => ({
    name: param?.r || faker.word.noun(),
    additions: [],
    limits: param?.l ? param.l : [],
    registration: { approvement: param?.a || false, whitelist: param?.w ? [param.w] : [] },
  });

  const mockRoute = (r?: TRoute["restrictions"]) => ({
    name: "/",
    restrictions: r ? r : [],
  });

  const mockUser = (param?: { r?: string; c?: string; v?: string }) => ({
    code: param?.c || faker.string.alphanumeric(),
    email,
    verify_email_token: param?.v || null,
    roles: [
      { name: param?.r || role, additions: new Map() },
      { name: faker.word.noun() || role, additions: new Map() },
    ],
  });

  const mockResetPass = (param?: { r?: string; t?: string; c?: Date }) => ({
    role: param?.r || role,
    email,
    token: param?.t || faker.string.nanoid(),
    created_at: param?.c || faker.date.past(),
    expired_at: faker.date.past(),
  });

  describe("success register", () => {
    const testCase = [
      {
        user: null,
        roleData: mockRole(),
        description:
          "should return non empty verify_email_token when the given email has not been registered and all criteria are satisfied",
        expected: (token: string | null) => expect(token).not.toBeNull(),
      },
      {
        user: mockUser({ r: cRole.admin }),
        roleData: mockRole(),
        description:
          "should return empty verify_email_token when the given email has been registered with other role and all criteria are satisfied",
        expected: (token: string | null) => expect(token).toBeNull(),
      },
      {
        user: null,
        roleData: mockRole({ a: true, w: email }),
        description:
          "should remove the given email from whitelist when the registration of the given role must use approvement and the given email is available in whitelist",
        expected: (token: string | null) => expect(token).not.toBeNull(),
      },
    ];

    it.each(testCase)("$description", async ({ user, roleData, expected }) => {
      roleRepository.findOneByName.mockResolvedValueOnce(roleData);
      if (roleData.registration.approvement) {
        roleRepository.updateRegistration.mockResolvedValueOnce();
      }
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      hasher.hashPassword.mockResolvedValueOnce(password);
      userRepository.findLastOne.mockResolvedValueOnce(null);
      userRepository.createOne.mockResolvedValueOnce();
      mailer.verifyEmailAccess.mockResolvedValueOnce();

      const upRegistMock = jest.spyOn(roleRepository, "updateRegistration").mockResolvedValueOnce();
      const token = await authService.register({ email, additions: {}, role });

      expected(token);
      expect(upRegistMock).toHaveBeenCalledTimes(roleData.registration.approvement ? 1 : 0);
      upRegistMock.mockRestore();
    });
  });

  describe("error register", () => {
    const testCase = [
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(null);
        },
        err: (error: Error) => appError.notFound(resMessage.roleIsNotFound),
        description: "should catch an error when the given role has not been registered",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole({ a: true }));
          userRepository.findOneByEmail.mockResolvedValueOnce(null);
        },
        err: (error: Error) => appError.unauthorized(resMessage.restrictedRole),
        description:
          "should catch an error when the registration of the given role must use approvement but the given email is not in whitelist",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
        },
        err: (error: Error) => appError.conflict(resMessage.userIsRegistered),
        description:
          "should catch an error when the given email has been registered with the given role",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
          userRepository.findOneByEmail.mockResolvedValueOnce(null);
          userRepository.findLastOne.mockResolvedValueOnce(
            mockUser({ c: `${config.memberCodePrefix}${config.maxMemberCode}` })
          );
        },
        err: (error: Error) => appError.unauthorized(resMessage.maxMemberCodeExceeded),
        description: "should catch an error when the maximum member code already exceeded",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
          userRepository.findOneByEmail.mockResolvedValueOnce(null);
          userRepository.findLastOne.mockResolvedValueOnce(
            mockUser({ c: `${config.memberCodePrefix}${config.maxMemberCode}` })
          );
        },
        err: (error: Error) => appError.unauthorized(resMessage.maxMemberCodeExceeded),
        description: "should catch an error when the maximum member code already exceeded",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockRejectedValueOnce(new Error("error"));
        },
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, err }) => {
      mocked();
      try {
        await authService.register({ email, additions: {}, role });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success verify email", () => {
    it("should not catch any error when the given token is valid", async () => {
      userRepository.findOneByToken.mockResolvedValueOnce(mockUser());

      await expect(authService.verifyEmail(faker.string.nanoid())).resolves.not.toThrow();
    });
  });

  describe("error verify email", () => {
    it("should catch an error when the given token is invalid", async () => {
      userRepository.findOneByToken.mockResolvedValueOnce(null);

      try {
        await authService.verifyEmail(faker.string.nanoid());
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.unauthorized(resMessage.invalidToken));
      }
    });

    it("should catch an error when any error from repository level", async () => {
      userRepository.findOneByToken.mockRejectedValueOnce(new Error("error"));

      try {
        await authService.verifyEmail(faker.string.nanoid());
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("success resend token to verify email", () => {
    it("should return token and ttl of token when all criteria are satisfied", async () => {
      const mock = mockUser({ v: faker.string.nanoid() }) as TUser;
      mock.updated_at = faker.date.past();
      userRepository.findOneByEmail.mockResolvedValueOnce(mock);
      userRepository.updateMailToken.mockResolvedValueOnce();
      mailer.verifyEmailAccess.mockResolvedValueOnce();

      await expect(authService.resendMailToken(email)).resolves.not.toThrow();
    });
  });

  describe("error resend token to verify email", () => {
    const testCase = [
      {
        mocked: () => {
          userRepository.findOneByEmail.mockResolvedValueOnce(null);
        },
        err: (error: Error) => appError.notFound(resMessage.userIsNotFound),
        description: "should catch an error when the given email has not been registered",
      },
      {
        mocked: () => {
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
        },
        err: (error: Error) => appError.conflict(resMessage.userIsVerified),
        description: "should catch an error when the account has been verified",
      },
      {
        mocked: () => {
          const mock = mockUser({ v: faker.string.nanoid() }) as TUser;
          mock.updated_at = new Date(new Date().getTime() + 3 * 60 * 1000);
          userRepository.findOneByEmail.mockResolvedValueOnce(mock);
        },
        err: (error: Error) => appError.tooManyReq(config.verifyMailPause),
        description: "should catch an error when the user request for token too frequent",
      },
      {
        mocked: () => {
          userRepository.findOneByEmail.mockRejectedValueOnce(new Error("error"));
        },
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, err }) => {
      mocked();

      try {
        await authService.resendMailToken(email);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success login", () => {
    it("should not catch any error when the given credentials is valid by the given role", async () => {
      roleRepository.findOneByName.mockResolvedValueOnce(mockRole({ r: role }));
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
      hasher.checkPassword.mockResolvedValueOnce(true);
      jwtProvider.sign.mockResolvedValueOnce(jwts);

      await expect(authService.login({ role, email, password })).resolves.not.toThrow();
    });
  });

  describe("error login", () => {
    const testCase = [
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(null);
        },
        err: (error: Error) => appError.notFound(resMessage.roleIsNotFound),
        description: "should catch an error when the given role has not been created",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole({ r: role }));
          userRepository.findOneByEmail.mockResolvedValueOnce(null);
        },
        err: (error: Error) => appError.notFound(resMessage.userIsNotFound),
        description: "should catch an error when the given email has not been registered",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole({ r: role }));
          userRepository.findOneByEmail.mockResolvedValueOnce(
            mockUser({ v: faker.string.nanoid() })
          );
        },
        err: (error: Error) => appError.unauthorized(resMessage.userUnverified),
        description: "should catch an error when the given email has not been verified",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole({ r: role }));
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser({ r: faker.word.noun() }));
        },
        err: (error: Error) => appError.unauthorized(resMessage.invalidRole),
        description:
          "should catch an error when the given email has not been registered with the given role",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole({ r: role }));
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
          hasher.checkPassword.mockResolvedValueOnce(false);
        },
        err: (error: Error) => appError.unauthorized(resMessage.wrongPassword),
        description: "should catch an error when the given password is wrong",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockRejectedValueOnce(new Error("error"));
        },
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, err }) => {
      mocked();

      try {
        await authService.login({ role, email, password });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success refresh token", () => {
    it("should not catch any error when the refresh token is valid", async () => {
      jwtProvider.verify.mockResolvedValueOnce({ role, email });

      await expect(authService.refreshToken(jwts.refreshToken)).resolves.not.toThrow();
    });
  });

  describe("error refresh token", () => {
    const testCase = [
      {
        mocked: () => {},
        param: undefined,
        err: (error: Error) => appError.forbidden(resMessage.noRefreshToken),
        description: "should catch an error when the refresh token is not available",
      },
      {
        mocked: () => {
          jwtProvider.verify.mockResolvedValueOnce(null);
        },
        param: jwts.refreshToken,
        err: (error: Error) => appError.forbidden(resMessage.invalidToken),
        description: "should catch an error when the given token is invalid",
      },
      {
        mocked: () => {
          jwtProvider.verify.mockRejectedValueOnce(new Error("error"));
        },
        param: jwts.refreshToken,
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, param, err }) => {
      mocked();

      try {
        await authService.refreshToken(param);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success verify password", () => {
    it("should not catch any error when the given password is true", async () => {
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
      hasher.checkPassword.mockResolvedValueOnce(true);

      await expect(authService.verifyPassword({ email, role, password })).resolves.not.toThrow();
    });
  });

  describe("error verify password", () => {
    const testCase = [
      {
        mocked: () => {
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
        },
        rolecase: faker.word.noun(),
        err: (error: Error) => appError.notFound(resMessage.invalidRole),
        description:
          "should catch an error when the given email has not been registered with the given role",
      },
      {
        mocked: () => {
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
          hasher.checkPassword.mockResolvedValueOnce(false);
        },
        rolecase: role,
        err: (error: Error) => appError.forbidden(resMessage.wrongPassword),
        description: "should catch an error when the given password is wrong",
      },
      {
        mocked: () => {
          userRepository.findOneByEmail.mockRejectedValueOnce(new Error("error"));
        },
        rolecase: role,
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, rolecase, err }) => {
      mocked();

      try {
        await authService.verifyPassword({ email, role: rolecase, password });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success change password", () => {
    it("should not catch any error when the given role is correct and internal server error", async () => {
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
      hasher.hashPassword.mockResolvedValueOnce(faker.internet.password());
      userRepository.updateAdditions.mockResolvedValueOnce();

      await expect(authService.changePassword({ email, role, password })).resolves.not.toThrow();
    });
  });

  describe("error change password", () => {
    it("should catch any error when the given email has not been registered with the given role", async () => {
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());

      try {
        await authService.changePassword({ email, role: faker.word.noun(), password });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.forbidden(resMessage.invalidRole));
      }
    });

    it("should catch any error when any error from repository level", async () => {
      userRepository.findOneByEmail.mockRejectedValueOnce(new Error("error"));

      try {
        await authService.changePassword({ email, role: faker.word.noun(), password });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("success send mail for reset token access", () => {
    it("should not catch any error when the given email has been registered and verified, and all criteria are satisfied", async () => {
      userRepository.findOneResetToken.mockResolvedValueOnce(null);
      roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
      mailer.resetPasswordAccess.mockResolvedValueOnce();

      await expect(authService.mailForgotPassword({ email, role })).resolves.not.toThrow();
    });
  });

  describe("error send mail for reset token access", () => {
    const testCase = [
      {
        mocked: (token: TResetPassword) => {
          userRepository.findOneResetToken.mockResolvedValueOnce(token);
        },
        rolecase: role,
        err: (token: TResetPassword) =>
          appError.tooManyReq(token.created_at!.getTime() + config.forgotPassPause),
        description: "should catch an error when user request for the reset token too frequent",
      },
      {
        mocked: (token: TResetPassword) => {
          userRepository.findOneResetToken.mockResolvedValueOnce(null);
          roleRepository.findOneByName.mockResolvedValueOnce(null);
        },
        rolecase: role,
        err: (token: TResetPassword) => appError.notFound(resMessage.roleIsNotFound),
        description: "should catch an error when the given role has not been created",
      },
      {
        mocked: (token: TResetPassword) => {
          userRepository.findOneResetToken.mockResolvedValueOnce(null);
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
          userRepository.findOneByEmail.mockResolvedValueOnce(null);
        },
        rolecase: role,
        err: (token: TResetPassword) => appError.notFound(resMessage.userIsNotFound),
        description: "should catch an error when the given has not been registered",
      },
      {
        mocked: (token: TResetPassword) => {
          userRepository.findOneResetToken.mockResolvedValueOnce(null);
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
          userRepository.findOneByEmail.mockResolvedValueOnce(
            mockUser({ v: faker.string.nanoid() })
          );
        },
        rolecase: role,
        err: (token: TResetPassword) => appError.unauthorized(resMessage.userUnverified),
        description: "should catch an error when the given email has not been verified",
      },
      {
        mocked: (token: TResetPassword) => {
          userRepository.findOneResetToken.mockResolvedValueOnce(null);
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
        },
        rolecase: faker.word.noun(),
        err: (token: TResetPassword) => appError.notFound(resMessage.invalidRole),
        description:
          "should catch an error when the given email has not registered with the given role",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, rolecase, err }) => {
      const mockLastToken = mockResetPass({ c: new Date(new Date().getTime() + 3 * 60 * 1000) });
      mocked(mockLastToken);

      try {
        await authService.mailForgotPassword({ email, role: rolecase });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(err(mockLastToken));
      }
    });

    it("should catch any error when any error from repository level", async () => {
      userRepository.findOneResetToken.mockRejectedValueOnce(new Error("error"));

      try {
        await authService.mailForgotPassword({ email, role });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("success reset password", () => {
    it("should not catch any error when the given token and role is correct", async () => {
      const token = faker.string.nanoid();
      userRepository.findOneResetToken.mockResolvedValueOnce(mockResetPass({ t: token }));
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
      hasher.hashPassword.mockResolvedValueOnce(faker.internet.password());
      userRepository.updateAdditions.mockResolvedValueOnce();
      userRepository.deleteResetToken.mockResolvedValueOnce();

      await expect(
        authService.resetPassword({ email, role, password, token })
      ).resolves.not.toThrow();
    });
  });

  describe("error reset password", () => {
    const testCase = [
      {
        mocked: () => {
          userRepository.findOneResetToken.mockResolvedValueOnce(null);
          return "token";
        },
        rolecase: role,
        err: (error: Error) => appError.unauthorized(resMessage.invalidToken),
        description: "should catch an error when the given token is invalid",
      },
      {
        mocked: () => {
          const token = faker.string.nanoid();
          userRepository.findOneResetToken.mockResolvedValueOnce(mockResetPass({ t: token }));
          userRepository.findOneByEmail.mockResolvedValueOnce(mockUser());
          return token;
        },
        rolecase: faker.word.noun(),
        err: (error: Error) => appError.forbidden(resMessage.invalidRole),
        description:
          "should catch any error when the given email has not been registered with the given role",
      },
      {
        mocked: () => {
          const token = faker.string.nanoid();
          userRepository.findOneResetToken.mockRejectedValueOnce(new Error("error"));
          return token;
        },
        rolecase: role,
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];

    it.each(testCase)("$description", async ({ mocked, rolecase, err }) => {
      const mockToken = mocked();
      try {
        await authService.resetPassword({ email, role: rolecase, password, token: mockToken });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success add role", () => {
    it("should not catch error when the given role name has not been created and the given access either readonly or noaccess", async () => {
      roleRepository.findOneByName.mockResolvedValueOnce(null);
      roleRepository.updateOne.mockResolvedValueOnce();

      const mRole = { ...mockRole() };
      mRole.limits = [
        { page: "/", access: "readonly" },
        { page: "/r", access: "noaccess" },
      ];
      await expect(authService.addRole(mRole)).resolves.not.toThrow();
    });
  });

  describe("error add role", () => {
    const testCase = [
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
        },
        limits: [{ page: "/", access: "readonly" }],
        err: (error: Error) => appError.conflict(resMessage.roleIsExist),
        description: "should catch error when the given role already exist",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(null);
        },
        limits: [{ page: "/", access: "noacces" }] as any,
        err: (error: Error) => appError.badRequest(resMessage.otherRolePermit),
        description: "should catch error when the given access is neither readonly or noaccess",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockRejectedValueOnce(new Error("error"));
        },
        limits: [{ page: "/", access: "readonly" }],
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];
    it.each(testCase)("$description", async ({ mocked, limits, err }) => {
      mocked();

      try {
        await authService.addRole(mockRole({ l: limits }));
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success update role", () => {
    it("should not catch error when the given role name has been created and the given access either readonly or noaccess", async () => {
      roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
      roleRepository.updateOne.mockResolvedValueOnce();

      await expect(authService.updateRole(mockRole())).resolves.not.toThrow();
    });
  });

  describe("error update role", () => {
    const testCase = [
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(null);
        },
        limits: [],
        err: (error: Error) => appError.notFound(resMessage.roleIsNotFound),
        description: "should catch error when the given role has not been created",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockResolvedValueOnce(mockRole());
        },
        limits: [{ page: "/", access: "noacces" }] as any,
        err: (error: Error) => appError.badRequest(resMessage.otherRolePermit),
        description: "should catch error when the given access is neither readonly or noaccess",
      },
      {
        mocked: () => {
          roleRepository.findOneByName.mockRejectedValueOnce(new Error("error"));
        },
        limits: [],
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];
    it.each(testCase)("$description", async ({ mocked, limits, err }) => {
      mocked();

      try {
        await authService.updateRole(mockRole({ l: limits }));
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success add route", () => {
    it("should not catch error when the given route name has not been created and the given method either POST, PATCH, PUT, GET, or DELETE", async () => {
      routeRepository.findOneByName.mockResolvedValueOnce(null);
      routeRepository.updateOne.mockResolvedValueOnce();

      const mRoute = { ...mockRoute() };
      mRoute.restrictions = [
        { method: "POST", roles: ["admin"] },
        { method: "PUT", roles: ["admin"] },
      ];
      await expect(authService.addRoute(mRoute)).resolves.not.toThrow();
    });
  });

  describe("error add route", () => {
    const testCase = [
      {
        mocked: () => {
          routeRepository.findOneByName.mockResolvedValueOnce(mockRoute());
        },
        restrictions: [{ method: "POST", roles: ["admin"] }],
        err: (error: Error) => appError.conflict(resMessage.serverRouteIsExist),
        description: "should catch error when the given route already exist",
      },
      {
        mocked: () => {
          routeRepository.findOneByName.mockResolvedValueOnce(null);
        },
        restrictions: [{ method: "OPTION", roles: ["admin"] }] as any,
        err: (error: Error) => appError.badRequest(resMessage.otherRouteMethod),
        description:
          "should catch error when the given method is neither POST, PATCH, PUT, GET, or DELETE",
      },
      {
        mocked: () => {
          routeRepository.findOneByName.mockRejectedValueOnce(new Error("error"));
        },
        restrictions: [{ method: "POST", roles: ["admin"] }],
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];
    it.each(testCase)("$description", async ({ mocked, restrictions, err }) => {
      mocked();

      try {
        await authService.addRoute(mockRoute(restrictions));
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });

  describe("success update route", () => {
    it("should not catch error when the given route name has been created and the given method either POST, PATCH, PUT, GET, or DELETE", async () => {
      routeRepository.findOneByName.mockResolvedValueOnce(mockRoute());
      routeRepository.updateOne.mockResolvedValueOnce();

      await expect(authService.updateRoute(mockRoute())).resolves.not.toThrow();
    });
  });

  describe("error update route", () => {
    const testCase = [
      {
        mocked: () => {
          routeRepository.findOneByName.mockResolvedValueOnce(null);
        },
        restrictions: [],
        err: (error: Error) => appError.notFound(resMessage.serverRouteIsNotFound),
        description: "should catch error when the given route has not been created",
      },
      {
        mocked: () => {
          routeRepository.findOneByName.mockResolvedValueOnce(mockRoute());
        },
        restrictions: [{ method: "OPTION", roles: ["admin"] }] as any,
        err: (error: Error) => appError.badRequest(resMessage.otherRouteMethod),
        description:
          "should catch error when the given route name has been created and the given method either POST, PATCH, PUT, GET, or DELETE",
      },
      {
        mocked: () => {
          routeRepository.findOneByName.mockRejectedValueOnce(new Error("error"));
        },
        restrictions: [],
        err: (error: Error) => appError.internalServer(error),
        description: "should catch an error when any error from repository level",
      },
    ];
    it.each(testCase)("$description", async ({ mocked, restrictions, err }) => {
      mocked();

      try {
        await authService.updateRoute(mockRoute(restrictions));
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toEqual(err(error));
      }
    });
  });
});
