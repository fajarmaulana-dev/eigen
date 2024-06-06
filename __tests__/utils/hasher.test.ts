import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { configInit, TConfig } from "../../utils/config";
import { Hasher } from "../../utils/hasher";

describe("Hasher", () => {
  const config = configInit() as TConfig;
  const hasher = new Hasher(config);

  const password = faker.internet.password();
  const hashedPassword = faker.internet.password();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("hashPassword", () => {
    it("should return hashed password when hashing success", async () => {
      const bcryptHashMock = jest
        .spyOn(bcrypt, "hash")
        .mockImplementation(() => Promise.resolve(hashedPassword));

      const resHashedPassword = await hasher.hashPassword(password);

      expect(bcryptHashMock).toHaveBeenCalledWith(password, config.hashCost);
      expect(resHashedPassword).toEqual(hashedPassword);
      bcryptHashMock.mockRestore();
    });

    it("should throw an error when hashing fail", async () => {
      jest
        .spyOn(bcrypt, "hash")
        .mockImplementation(() => Promise.reject(new Error("Hashing failed")));

      await expect(hasher.hashPassword(password)).rejects.toThrow("Hashing failed");
    });
  });

  describe("checkPassword", () => {
    it("should return true when password matches hash", async () => {
      jest.spyOn(bcrypt, "compare").mockImplementation(() => Promise.resolve(true));

      const result = await hasher.checkPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it("should return false when password does not match hash", async () => {
      jest.spyOn(bcrypt, "compare").mockImplementation(() => Promise.resolve(false));

      const result = await hasher.checkPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });

    it("should throw an error when comparing fail", async () => {
      jest
        .spyOn(bcrypt, "compare")
        .mockImplementation(() => Promise.reject(new Error("Comparing failed")));

      await expect(hasher.checkPassword(password, hashedPassword)).rejects.toThrow(
        "Comparing failed"
      );
    });
  });
});
