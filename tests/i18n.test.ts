import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../packages/i18n/src/dictionaries/en";
import { tr } from "../packages/i18n/src/dictionaries/tr";
import {
  createTranslator,
  formatMoneyMinor,
  interpolate,
  localeFromCountry,
  parseAcceptLanguage,
  resolveLocale,
} from "../packages/i18n/src/index";

test("an explicit choice outranks every detected signal", () => {
  assert.deepEqual(
    resolveLocale({
      override: "en",
      cookie: "tr",
      user: "tr",
      acceptLanguage: "tr-TR,tr;q=0.9",
      country: "TR",
    }),
    { locale: "en", source: "override" },
  );

  assert.deepEqual(
    resolveLocale({
      cookie: "en",
      user: "tr",
      acceptLanguage: "tr-TR",
      country: "TR",
    }),
    { locale: "en", source: "cookie" },
  );

  assert.deepEqual(
    resolveLocale({ user: "en", acceptLanguage: "tr-TR", country: "TR" }),
    { locale: "en", source: "user" },
  );
});

test("browser language and IP country do not override the Turkish default", () => {
  assert.deepEqual(
    resolveLocale({ acceptLanguage: "tr-TR,tr;q=0.9,en;q=0.8", country: "DE" }),
    { locale: "tr", source: "default" },
  );

  assert.deepEqual(
    resolveLocale({ acceptLanguage: "en-GB,en;q=0.9", country: "TR" }),
    { locale: "tr", source: "default" },
  );
});

test("country is ignored until the visitor picks a language", () => {
  assert.deepEqual(resolveLocale({ acceptLanguage: "de-DE,fr;q=0.9", country: "TR" }), {
    locale: "tr",
    source: "default",
  });

  assert.deepEqual(resolveLocale({ acceptLanguage: "de-DE", country: "DE" }), {
    locale: "tr",
    source: "default",
  });

  assert.deepEqual(resolveLocale({}), { locale: "tr", source: "default" });
});

test("a browser asking for neither language still opens in Turkish", () => {
  assert.deepEqual(resolveLocale({ acceptLanguage: "de-DE,fr;q=0.9" }), {
    locale: "tr",
    source: "default",
  });
});

test("unsupported and malformed signals are ignored", () => {
  // "*" is the absence of a preference, so it must not force English.
  assert.deepEqual(resolveLocale({ cookie: "de", user: "", acceptLanguage: "*" }), {
    locale: "tr",
    source: "default",
  });

  assert.equal(localeFromCountry("tur"), null);
  assert.equal(localeFromCountry(""), null);
  assert.equal(localeFromCountry("tr"), "tr");
});

test("accept-language honours quality ranking over document order", () => {
  assert.equal(parseAcceptLanguage("en;q=0.4,tr;q=0.8"), "tr");
  assert.equal(parseAcceptLanguage("tr;q=0,en"), "en");
  assert.equal(parseAcceptLanguage("de,fr"), null);
  assert.equal(parseAcceptLanguage(null), null);
});

test("dictionaries cover the same keys", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(tr).sort());
});

test("every translation expects the same placeholders", () => {
  const placeholders = (template: string) =>
    [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

  for (const key of Object.keys(tr) as Array<keyof typeof tr>) {
    // A typo like {credit} for {credits} renders the literal braces to the
    // user, so mismatched placeholders are a bug, not a translation choice.
    assert.deepEqual(
      placeholders(en[key]),
      placeholders(tr[key]),
      `placeholder mismatch for "${key}"`,
    );
  }
});

test("translator interpolates and falls back to the key", () => {
  assert.equal(interpolate("{count} ürün", { count: 3 }), "3 ürün");
  assert.equal(interpolate("{unknown} ürün", { count: 3 }), "{unknown} ürün");

  const t = createTranslator("en");
  assert.equal(t("app.name"), "Hoflayn");
});

test("money formatting follows the locale, not the currency", () => {
  assert.equal(formatMoneyMinor(123456, "USD", "en"), "$1,234.56");
  assert.match(formatMoneyMinor(123456, "TRY", "tr"), /1\.234,56/);
  assert.match(formatMoneyMinor(123456, "TRY", "en"), /1,234\.56/);
});
