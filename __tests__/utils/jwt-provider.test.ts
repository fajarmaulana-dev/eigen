import jwt from "jsonwebtoken";
import { JWK, JWE } from "node-jose";
import { faker } from "@faker-js/faker";
import { configInit, TConfig } from "../../utils/config";
import { JwtProvider, TJwt, TJwtPayloads } from "../../utils/jwt-provider";

jest.mock("jsonwebtoken");
jest.mock("node-jose");

describe("JwtProvider", () => {
  const config = configInit() as TConfig;
  let jwtProvider: JwtProvider;

  const payloads: TJwtPayloads = { email: faker.internet.email(), role: faker.word.noun() };
  const tokens: TJwt = {
    accessToken: faker.string.sample(125),
    refreshToken: faker.string.sample(125),
  };
  const data = { data: "encrypted" };
  const mockKey = { keystore: faker.word.verb() };

  beforeEach(() => {
    jwtProvider = new JwtProvider(config);
    jest.clearAllMocks();
  });

  describe("sign", () => {
    const accessData = { expiresIn: config.accessExp / 1000, issuer: config.issuer };
    const refreshData = { expiresIn: config.refreshExp / 1000, issuer: config.issuer };
    const initEncrypt = () => {
      const mockEncrypt = {
        update: jest.fn().mockReturnThis(),
        final: jest.fn().mockResolvedValue(data.data),
      };
      const createKeyStoreMock = {
        add: jest.fn().mockResolvedValue(mockKey),
      };

      (JWK.createKeyStore as jest.Mock).mockImplementation(() => createKeyStoreMock);
      (JWE.createEncrypt as jest.Mock).mockImplementation(() => mockEncrypt);
    };
    const testCase = [
      {
        description:
          "should sign JWT with access and refresh tokens when signing process is success and refresh token is not provided",
        refresh: undefined,
        exprectedResult: tokens,
        expected: () => {
          expect(jwt.sign).toHaveBeenCalledWith(
            data,
            config.accessKey,
            expect.objectContaining(accessData)
          );
          expect(jwt.sign).toHaveBeenCalledWith(
            data,
            config.refreshKey,
            expect.objectContaining(refreshData)
          );
        },
      },
      {
        description:
          "should sign JWT with access and refresh tokens when signing process is success and refresh token is provided",
        refresh: tokens.refreshToken,
        exprectedResult: { ...tokens, refreshToken: "" },
        expected: () => {
          expect(jwt.sign).toHaveBeenCalledWith(
            data,
            config.accessKey,
            expect.objectContaining(accessData)
          );
          expect(jwt.sign).not.toHaveBeenCalledWith(
            data,
            config.refreshKey,
            expect.objectContaining(refreshData)
          );
        },
      },
    ];

    it.each(testCase)("$description", async ({ refresh, exprectedResult, expected }) => {
      initEncrypt();
      (jwt.sign as jest.Mock).mockImplementation((payload, key) => {
        if (key === config.accessKey) {
          return tokens.accessToken;
        }
        return tokens.refreshToken;
      });

      const result = await jwtProvider.sign(payloads, refresh);

      expect(result).toEqual(exprectedResult);
      expected();
    });

    it("should throw an error when signing process is failed", async () => {
      initEncrypt();
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error("error");
      });

      await expect(jwtProvider.sign(payloads)).rejects.toThrow("error");

      expect(jwt.sign).toHaveBeenCalledWith(
        data,
        config.accessKey,
        expect.objectContaining(accessData)
      );
    });
  });

  describe("verify", () => {
    const initDecrypt = () => {
      const mockDecrypt = { plaintext: Buffer.from(JSON.stringify(payloads)) };
      const createKeyStoreMock = {
        add: jest.fn().mockResolvedValue(mockKey),
      };

      (JWK.createKeyStore as jest.Mock) = jest.fn(() => createKeyStoreMock);
      (JWE.createDecrypt as jest.Mock) = jest.fn(() => ({
        decrypt: jest.fn().mockResolvedValue(mockDecrypt),
      }));
    };

    it("should return null when the given token is invalid", async () => {
      initDecrypt();
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(jwtProvider.verify("invalidToken")).rejects.toThrow("invalid token");

      expect(jwt.verify).toHaveBeenCalledWith("invalidToken", config.refreshKey);
    });

    it("should verify access token correctly", async () => {
      initDecrypt();
      (jwt.verify as jest.Mock).mockImplementation((token, key) => {
        if (token === tokens.accessToken && key === config.accessKey) {
          return data;
        }
        throw new Error("Invalid token");
      });

      const result = await jwtProvider.verify(tokens.accessToken, true);

      expect(jwt.verify).toHaveBeenCalledWith(tokens.accessToken, config.accessKey);
      expect(result).toEqual(payloads);
    });

    it("should verify refresh token correctly", async () => {
      initDecrypt();
      (jwt.verify as jest.Mock).mockImplementation((token, key) => {
        if (token === tokens.refreshToken && key === config.refreshKey) {
          return data;
        }
        throw new Error("Invalid token");
      });

      const result = await jwtProvider.verify(tokens.refreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(tokens.refreshToken, config.refreshKey);
      expect(result).toEqual(payloads);
    });

    it("should return null when data is missing", async () => {
      initDecrypt();
      (jwt.verify as jest.Mock).mockImplementation(() => ({ data: null }));

      const result = await jwtProvider.verify(tokens.refreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(tokens.refreshToken, config.refreshKey);
      expect(result).toBeNull();
    });
  });
});
