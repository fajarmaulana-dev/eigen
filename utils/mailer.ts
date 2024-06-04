import nodemailer from "nodemailer";
import { TConfig } from "./config";
import appError from "../errors/apperror";
import { resMessage } from "../constants/http-response";

type TMailerParam = {
  email: string;
  subject: string;
  path: string;
  user: string;
  text: string;
  btn?: string;
};

export interface IMailer {
  sendMail: (data: TMailerParam) => Promise<void>;
  verifyEmailAccess: (
    data: Pick<TMailerParam, "email" | "user"> & { token: string }
  ) => Promise<void>;
  resetPasswordAccess: (
    data: Pick<TMailerParam, "email" | "user"> & { token: string; role: string }
  ) => Promise<void>;
}

export class Mailer implements IMailer {
  constructor(private config: TConfig) {
    this.config = config;
  }
  async sendMail(data: {
    email: string;
    subject: string;
    path: string;
    user: string;
    text: string;
    btn?: string;
  }) {
    try {
      const transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        secure: false,
        auth: { user: this.config.email, pass: this.config.emailPassword },
        debug: false,
        logger: true,
      });

      await transporter.sendMail({
        from: `MyApp <${this.config.email}>`,
        to: data.email,
        subject: data.subject,
        html: `
                <div style="height: 20rem; text-align: center;">
                    <h3 style="margin: 3rem 0 1rem 0; font-weight: bolder; color: #28a0f6;">Hi, ${
                      data.user
                    }</h3>
                    <h4 style="margin-bottom: 2rem; color: #4b5563;">${data.text}</h4>
                    ${
                      data.btn
                        ? `<a style="padding: .75rem 2rem; background-color: #28a0f6; color: #ffff; border-radius: .5rem; text-decoration: none; font-weight: bolder;"
                            href="${this.config.frontendUrl + data.path}">${data.btn}</a>`
                        : ""
                    }
                </div>
            `,
      });

      console.log("Email has been sent");
    } catch (error) {
      throw appError.internalServer(new Error(resMessage.emailFailed), resMessage.emailFailed);
    }
  }

  async verifyEmailAccess(data: Pick<TMailerParam, "email" | "user"> & { token: string }) {
    await this.sendMail({
      email: data.email,
      subject: `${this.config.appName} Account Verification`,
      path: `/auth/verify?token=${data.token}`,
      user: data.user,
      text: "Please click on the button bellow to verify your account.",
      btn: "Verify Account",
    });
  }

  async resetPasswordAccess(
    data: Pick<TMailerParam, "email" | "user"> & { token: string; role: string }
  ) {
    await this.sendMail({
      email: data.email,
      subject: "Reset Password Access",
      path: `/auth/reset-password?email=${data.email}&token=${data.token}&role=${data.role}`,
      user: data.user,
      text: "This access will be expired in 10 minutes. Please click on the button bellow to reset your password.",
      btn: "Reset Password",
    });
  }
}
