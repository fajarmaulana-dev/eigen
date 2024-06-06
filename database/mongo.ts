import { TConfig } from "../utils/config";
import { set, connect, connection } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { cEnv } from "../constants/env";

let mongo: MongoMemoryServer | null = null;
export const connectDB = async (config: TConfig) => {
  set("strictQuery", false);
  try {
    let dbUrl = config.dbUrl;
    if (config.env === cEnv.test) {
      mongo = await MongoMemoryServer.create();
      dbUrl = mongo.getUri();
    }

    connect(dbUrl);
  } catch (error) {
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await connection.close();
    if (mongo) await mongo.stop();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
