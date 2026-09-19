import {
  createTranslator,
  DEFAULT_LOCALE,
  type MessageKey,
  type MessageVars,
  type Translator,
} from "@hoflayn/i18n";

export type CalcMessage = {
  messageKey: MessageKey;
  vars?: MessageVars;
};

export function formatCalcMessages(
  messages: Array<CalcMessage | string>,
  t: Translator = createTranslator(DEFAULT_LOCALE),
): string[] {
  return messages.map((item) =>
    typeof item === "string" ? item : t(item.messageKey, item.vars),
  );
}
