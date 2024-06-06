import nodemailer from "nodemailer";
import appError from "../../errors/apperror";
import { resMessage } from "../../constants/http-response";
import { faker } from "@faker-js/faker";
import { TConfig, configInit } from "../../utils/config";
import { IMailer, Mailer } from "../../utils/mailer";

jest.mock("nodemailer");

describe("Mailer", () => {
  const config = configInit() as TConfig;

  let mailer: IMailer;

  beforeEach(() => {
    mailer = new Mailer(config);
    jest.clearAllMocks();
  });

  describe("sendMail", () => {
    const mailData = {
      email: faker.internet.email(),
      subject: "Test Subject",
      path: "/test/path",
      user: "Test User",
      text: "Test Text",
      btn: "Test Button",
    };
    it("should send an email successfully", async () => {
      const sendMailMock = jest.fn().mockResolvedValueOnce({});
      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce({ sendMail: sendMailMock });

      await expect(mailer.sendMail(mailData)).resolves.not.toThrow();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        secure: false,
        auth: { user: config.email, pass: config.emailPassword },
        debug: false,
        logger: true,
      });

      expect(sendMailMock).toHaveBeenCalledWith({
        from: `${config.appName} <${config.email}>`,
        to: mailData.email,
        subject: mailData.subject,
        html: expect.any(String),
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
    });

    it("should throw an error when sending email fails", async () => {
      const sendMailMock = jest.fn().mockRejectedValueOnce(new Error("Email sending failed"));
      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce({ sendMail: sendMailMock });

      await expect(mailer.sendMail(mailData)).rejects.toThrow(
        appError.internalServer(new Error(resMessage.emailFailed), resMessage.emailFailed)
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("verifyEmailAccess", () => {
    it("should send verification email with correct parameters", async () => {
      const sendMailMock = jest.fn().mockResolvedValueOnce({});
      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce({ sendMail: sendMailMock });

      const data = {
        email: faker.internet.email(),
        user: faker.internet.userName(),
        token: faker.string.nanoid(),
      };

      await mailer.verifyEmailAccess(data);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: `${config.appName} <${config.email}>`,
        to: data.email,
        subject: `${config.appName} Account Verification`,
        html: expect.any(String),
      });
    });
  });

  describe("resetPasswordAccess", () => {
    it("should send reset password email with correct parameters", async () => {
      const sendMailMock = jest.fn().mockResolvedValueOnce({});
      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce({ sendMail: sendMailMock });

      const data = {
        email: faker.internet.email(),
        user: faker.internet.userName(),
        token: faker.string.nanoid(),
        role: faker.word.noun(),
      };

      await mailer.resetPasswordAccess(data);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: `${config.appName} <${config.email}>`,
        to: data.email,
        subject: "Reset Password Access",
        html: expect.any(String),
      });
    });
  });
});
