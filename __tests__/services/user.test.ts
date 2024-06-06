import appError from "../../errors/apperror";
import { resMessage } from "../../constants/http-response";
import { faker } from "@faker-js/faker";
import { Mock, mock } from "ts-jest-mocker";
import { BookRepository } from "../../repositories/book";
import { UserRepository } from "../../repositories/user";
import { UserService } from "../../services/user";
import { convertToGetUsersResponse } from "../../dtos/user";
import { ClientSession, startSession } from "mongoose";
import { cBook } from "../../constants/book";

jest.mock("../../repositories/book.ts");
jest.mock("../../repositories/user.ts");
jest.mock("mongoose");

describe("User Service", () => {
  let userService: UserService;
  let bookRepository: Mock<BookRepository>;
  let userRepository: Mock<UserRepository>;
  let mockSession: jest.Mocked<ClientSession>;
  beforeEach(() => {
    bookRepository = mock(BookRepository);
    userRepository = mock(UserRepository);
    mockSession = {
      withTransaction: jest.fn().mockImplementation((fn: Function) => fn()),
      endSession: jest.fn(),
    } as unknown as jest.Mocked<ClientSession>;
    userService = new UserService(userRepository, bookRepository);

    (startSession as jest.Mock).mockResolvedValue(mockSession);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const additions = new Map();
  additions.set("name", faker.internet.userName());
  additions.set("borrowed_book_codes", []);
  additions.set("penalized_at", null);
  const role = "user";
  const mockUsers = {
    totalData: faker.number.int(),
    data: [
      {
        code: faker.string.alphanumeric(),
        email: faker.internet.email(),
        verify_email_token: null,
        roles: [
          { name: role, additions },
          { name: "admin", additions: new Map() },
        ],
      },
    ],
  };

  const mockBook = {
    code: "JK-45",
    title: faker.lorem.words(),
    author: faker.internet.userName(),
    stock: 2,
  };

  describe("get all users", () => {
    const limit = "10";
    it("should return users by filter with metadata when page value is a natural number", async () => {
      const page = "1";
      userRepository.findAll.mockResolvedValueOnce(mockUsers);

      const users = await userService.getAllUsers({ role, page, limit });

      expect(users).toEqual({
        data: convertToGetUsersResponse(mockUsers.data, role),
        total_data: mockUsers.totalData,
        page: +page,
        per_page: +limit,
      });
    });

    it("should catch an error when page value is not a natural number", async () => {
      const page = "-1.0";

      try {
        await userService.getAllUsers({ role, page, limit });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.badRequest(resMessage.pageIsNaturalNumber));
      }
    });

    it("should catch an error when any error catched from repository level", async () => {
      const page = "1";
      userRepository.findAll.mockRejectedValueOnce(new Error("error"));

      try {
        await userService.getAllUsers({ role, page, limit });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("borrow books", () => {
    it("should not catch error when user has not been borrow books to two times and not a penalized user", async () => {
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(mockUsers.data[0]);
      bookRepository.updateStocks.mockResolvedValueOnce();
      userRepository.updateAdditions.mockResolvedValueOnce();

      const totalBorrows = await userService.borrowBooks(["JK-45"], mockUsers.data[0].email);

      expect(mockSession.withTransaction).toHaveBeenCalledTimes(1);
      expect(bookRepository.findOneByCode).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByEmail).toHaveBeenCalledTimes(1);
      expect(bookRepository.updateStocks).toHaveBeenCalledTimes(1);
      expect(userRepository.updateAdditions).toHaveBeenCalledTimes(1);
      expect(totalBorrows).toBe(1);
    });

    it("should catch an error when user want to borrow unavailable book", async () => {
      bookRepository.findOneByCode.mockResolvedValueOnce(null);

      try {
        await userService.borrowBooks(["JK-45"], mockUsers.data[0].email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.notFound(resMessage.bookIsNotFound));
      }
    });

    it("should catch an error when user want to borrow book that out of stock", async () => {
      const books = { ...mockBook };
      books.stock = 0;
      bookRepository.findOneByCode.mockResolvedValueOnce(books);

      try {
        await userService.borrowBooks(["JK-45"], mockUsers.data[0].email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.notFound(resMessage.bookIsOutOfStock));
      }
    });

    it("should catch an error when any borrowed book with late return", async () => {
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set("borrowed_book_codes", [
        {
          code: "JK-46",
          created_at: new Date(new Date().getTime() - cBook.maxBorrowTime - 1),
        },
      ]);

      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      try {
        await userService.borrowBooks(["JK-45"], user.email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.forbidden(resMessage.penalizedUser));
      }
    });

    it("should catch an error when user is a penalized user", async () => {
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set(
        "penalized_at",
        new Date(new Date().getTime() - cBook.maxPenaltyTime)
      );

      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      try {
        await userService.borrowBooks(["JK-45"], user.email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.forbidden(resMessage.penalizedUser));
      }
    });

    it("should catch an error when user want to borrow more than 2 book", async () => {
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set("borrowed_book_codes", [
        {
          code: "JK-46",
          created_at: new Date(),
        },
        {
          code: "JK-47",
          created_at: new Date(),
        },
      ]);

      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      try {
        await userService.borrowBooks(["JK-45"], user.email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.badRequest(resMessage.tooManyBorrow));
      }
    });

    it("should catch an error when user want to borrow a book that has been borrowed", async () => {
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set("borrowed_book_codes", [
        {
          code: "JK-45",
          created_at: new Date(),
        },
      ]);

      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      try {
        await userService.borrowBooks(["JK-45"], user.email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.conflict(resMessage.hasBeenBorrow));
      }
    });

    it("should catch an error when any error from repository level", async () => {
      bookRepository.findOneByCode.mockRejectedValueOnce(new Error("error"));

      try {
        await userService.borrowBooks(["JK-45"], mockUsers.data[0].email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("return books", () => {
    it("should not catch any error when user just return the books that borrowed by him", async () => {
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set("borrowed_book_codes", [
        {
          code: mockBook.code,
          created_at: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      ]);
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      bookRepository.updateStocks.mockResolvedValueOnce();
      userRepository.updateAdditions.mockResolvedValueOnce();

      await expect(
        userService.returnBooks(["JK-45"], mockUsers.data[0].email)
      ).resolves.not.toThrow();
    });

    it("should penalized user when user late to return the book", async () => {
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set("borrowed_book_codes", [
        {
          code: mockBook.code,
          created_at: new Date(new Date().getTime() - cBook.maxBorrowTime - 1),
        },
      ]);
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);
      bookRepository.updateStocks.mockResolvedValueOnce();
      userRepository.updateAdditions.mockResolvedValueOnce();

      const { with_penalty } = await userService.returnBooks(["JK-45"], mockUsers.data[0].email);
      expect(with_penalty).toBe(true);
    });

    it("should catch an error when user return a book that not available", async () => {
      bookRepository.findOneByCode.mockResolvedValueOnce(null);

      try {
        await userService.returnBooks(["JK-45"], mockUsers.data[0].email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.notFound(resMessage.bookIsNotFound));
      }
    });

    it("should catch an error when user return a book that not borrowed by him", async () => {
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBook);
      const user = { ...mockUsers.data[0] };
      user.roles[0].additions.set("borrowed_book_codes", [
        {
          code: mockBook.code,
          created_at: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      ]);
      userRepository.findOneByEmail.mockResolvedValueOnce(user);

      try {
        await userService.returnBooks(["JK-46"], mockUsers.data[0].email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.badRequest(resMessage.hasNotBeenBorrow));
      }
    });

    it("should catch an error when any error catched from repository level", async () => {
      bookRepository.findOneByCode.mockRejectedValueOnce(new Error("error"));

      try {
        await userService.returnBooks(["JK-45"], mockUsers.data[0].email);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });
});
