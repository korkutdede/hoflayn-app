import { tr } from "./tr";

export type MessageKey = keyof typeof tr;

export type Dictionary = Readonly<Record<MessageKey, string>>;
