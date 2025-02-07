import { db } from 'tailchat-server-sdk';
const { getModelForClass, prop, modelOptions, TimeStamps } = db;

@modelOptions({
  options: {
    customName: 'p_excalidraw',
  },
})
export class Excalidraw extends TimeStamps implements db.Base {
  _id: db.Types.ObjectId;
  id: string;

  @prop()
  userId: string;

  @prop()
  dataState: Record<string, any>;
}

export type ExcalidrawDocument = db.DocumentType<Excalidraw>;

const model = getModelForClass(Excalidraw);

export type ExcalidrawModel = typeof model;

export default model;
