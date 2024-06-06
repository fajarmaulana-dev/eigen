import appError from "../../errors/apperror";
import { resMessage } from "../../constants/http-response";
import { Mock, mock } from "ts-jest-mocker";
import { BookRepository } from "../../repositories/book";
import { BookService } from "../../services/book";
import { faker } from "@faker-js/faker";
import { convertToGetBooksResponse } from "../../dtos/book";

jest.mock("../../repositories/book.ts");

describe("Book Service", () => {
  let bookService: BookService;
  let bookRepository: Mock<BookRepository>;
  beforeEach(() => {
    bookRepository = mock(BookRepository);
    bookService = new BookService(bookRepository);
  });

  const mockBooks = {
    totalData: faker.number.int(),
    data: [
      {
        code: faker.string.alphanumeric(),
        title: faker.lorem.words(),
        author: faker.internet.userName(),
        stock: faker.number.int(),
      },
    ],
  };

  describe("get all books", () => {
    it("should return books by filter with metadata when page value is a natural number", async () => {
      const page = "1";
      const limit = "10";
      bookRepository.findAll.mockResolvedValueOnce(mockBooks);

      const books = await bookService.getAllBooks(page, limit);

      expect(books).toEqual({
        data: convertToGetBooksResponse(mockBooks.data),
        total_data: mockBooks.totalData,
        page: +page,
        per_page: +limit,
      });
    });

    it("should catch an error when page value is not a natural number", async () => {
      const page = "-1.0";
      const limit = "10";

      try {
        await bookService.getAllBooks(page, limit);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.badRequest(resMessage.pageIsNaturalNumber));
      }
    });

    it("should catch an error when any error catched from repository level", async () => {
      const page = "1";
      const limit = "10";
      bookRepository.findAll.mockRejectedValueOnce(new Error("error"));

      try {
        await bookService.getAllBooks(page, limit);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("add book", () => {
    it("should not catch any error when book and book code has not been registered and stock value is valid", async () => {
      bookRepository.findOne.mockResolvedValueOnce(null);
      bookRepository.findOneByCode.mockResolvedValueOnce(null);
      bookRepository.updateOne(mockBooks.data[0]);

      await expect(bookService.addBook(mockBooks.data[0])).resolves.not.toThrow();
    });

    it("should catch an error when the given stock is negative number", async () => {
      const payloads = { ...mockBooks.data[0], stock: -1 };
      try {
        await bookService.addBook(payloads);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.badRequest(resMessage.stockIsWholeNumber));
      }
    });

    it("should catch an error when the given data already exists", async () => {
      bookRepository.findOne.mockResolvedValueOnce(mockBooks.data[0]);
      try {
        await bookService.addBook(mockBooks.data[0]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.conflict(resMessage.bookIsExist));
      }
    });

    it("should catch an error when the given book code already used", async () => {
      bookRepository.findOne.mockResolvedValueOnce(null);
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBooks.data[0]);
      try {
        await bookService.addBook(mockBooks.data[0]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.conflict(resMessage.bookCodeIsUsed));
      }
    });

    it("should catch an error when any error catched from repository level", async () => {
      bookRepository.findOne.mockRejectedValueOnce(new Error("error"));

      try {
        await bookService.addBook(mockBooks.data[0]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });

  describe("update book", () => {
    it("should not catch any error when book has been registered and book code has not been registered and stock value is valid", async () => {
      bookRepository.findOne.mockResolvedValueOnce(mockBooks.data[0]);
      bookRepository.findOneByCode.mockResolvedValueOnce(null);
      bookRepository.updateOne(mockBooks.data[0]);

      await expect(bookService.updateBook(mockBooks.data[0])).resolves.not.toThrow();
    });

    it("should catch an error when the given stock is negative number", async () => {
      const payloads = { ...mockBooks.data[0], stock: -1 };
      try {
        await bookService.updateBook(payloads);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.badRequest(resMessage.stockIsWholeNumber));
      }
    });

    it("should catch an error when the given data is not found", async () => {
      bookRepository.findOne.mockResolvedValueOnce(null);
      try {
        await bookService.updateBook(mockBooks.data[0]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.notFound(resMessage.bookIsNotFound));
      }
    });

    it("should catch an error when the given book code already used by other book", async () => {
      const payloads = { ...mockBooks.data[0], author: "Wissif" };
      bookRepository.findOne.mockResolvedValueOnce(payloads);
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBooks.data[0]);
      try {
        await bookService.updateBook(payloads);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.conflict(resMessage.bookCodeIsUsed));
      }
    });

    it("should catch an error when the given book code already used by other book", async () => {
      const payloads = { ...mockBooks.data[0], title: "Wissif" };
      bookRepository.findOne.mockResolvedValueOnce(payloads);
      bookRepository.findOneByCode.mockResolvedValueOnce(mockBooks.data[0]);
      try {
        await bookService.updateBook(payloads);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.conflict(resMessage.bookCodeIsUsed));
      }
    });

    it("should catch an error when any error catched from repository level", async () => {
      bookRepository.findOne.mockRejectedValueOnce(new Error("error"));

      try {
        await bookService.updateBook(mockBooks.data[0]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(appError.internalServer(error as Error));
      }
    });
  });
});
