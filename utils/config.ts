import dotenv from "dotenv";
dotenv.config();

export type TConfig = {
  env: string;
  dbUrl: string;
  port: number;
  hashCost: number;
  issuer: string;
  accessExp: number;
  refreshExp: number;
  forgotPassExp: number;
  verifyMailPause: number;
  forgotPassPause: number;
  accessKey: string;
  refreshKey: string;
  secretKey: string;
  frontendUrl: string;
  email: string;
  emailPassword: string;
  smtpHost: string;
  smtpPort: number;
  maxMemberCode: number;
  memberCodePrefix: string;
  appName: string;
};

export const configInit = (): TConfig | string => {
  const init: Record<string, string | undefined> = {
    env: process.env.NODE_ENV,
    dbUrl: process.env.DB_URL,
    port: process.env.PORT,
    hashCost: process.env.HASH_COST,
    issuer: process.env.ISSUER,
    accessExp: process.env.ACCESS_EXP,
    refreshExp: process.env.REFRESH_EXP,
    forgotPassExp: process.env.FORGOT_PASS_EXP,
    verifyMailPause: process.env.VERIFY_MAIL_PAUSE,
    forgotPassPause: process.env.FORGOT_PASS_PAUSE,
    accessKey: process.env.ACCESS_KEY,
    secretKey: process.env.SECRET_KEY,
    refreshKey: process.env.REFRESH_KEY,
    frontendUrl: process.env.FRONTEND_URL,
    email: process.env.EMAIL,
    emailPassword: process.env.EMAIL_PASSWORD,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    maxMemberCode: process.env.MAX_MEMBER_CODE,
    memberCodePrefix: process.env.MEMBER_CODE_PREFIX,
    appName: process.env.APP_NAME,
  };

  if (Object.values(init).includes(undefined)) {
    return JSON.stringify(Object.keys(init).filter((i) => !init[i]));
  }

  const transformer: Record<string, string | number> = {
    env: "",
    dbUrl: "",
    port: 0,
    hashCost: 0,
    issuer: "",
    accessExp: 0,
    refreshExp: 0,
    verifyMailPause: 0,
    forgotPassPause: 0,
    accessKey: "",
    secretKey: "",
    refreshKey: "",
    frontendUrl: "",
    email: "",
    emailPassword: "",
    smtpHost: "",
    smtpPort: 0,
    maxMemberCode: 0,
    memberCodePrefix: "",
    appName: "",
  };

  return Object.fromEntries(
    Object.keys(transformer).map((key) => {
      const initValue = init as Record<string, string>;
      return [key, typeof transformer[key] == "number" ? +initValue[key] : initValue[key]];
    })
  ) as TConfig;
};
