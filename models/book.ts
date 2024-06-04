import { Schema, model } from "mongoose";
import { Model } from "mongoose";

export type TBook = {
  code: string;
  title: string;
  author: string;
  stock: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
};

const bookSchema = new Schema<TBook>({
  code: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  stock: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: Date,
});

export type TBookModel = Model<TBook>;
export default model<TBook>("Book", bookSchema);
