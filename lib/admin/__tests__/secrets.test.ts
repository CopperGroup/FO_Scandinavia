import assert from "node:assert/strict";
import { describe, it } from "node:test";
// The plain-Node copy of the sealing used by tools/migrate-settings-from-env.mjs.
import * as script from "../../../tools/settings-seal.mjs";
import { maskSecret, openSecret, sealSecret } from "../../secrets";
import { readSenderSuggestion } from "../novaposhta";
import { readPastedKey } from "../np-key";

const SECRET = "unit-test-secret-not-used-anywhere";
const KEY = "0123456789abcdef0123456789abcdef";

function withSecret<T>(run: () => T): T {
  const before = { settings: process.env.SETTINGS_SECRET, encryption: process.env.ENCRYPTION_KEY, auth: process.env.NEXTAUTH_SECRET };
  process.env.SETTINGS_SECRET = SECRET;
  try {
    return run();
  } finally {
    for (const [name, value] of [["SETTINGS_SECRET", before.settings], ["ENCRYPTION_KEY", before.encryption], ["NEXTAUTH_SECRET", before.auth]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

describe("sealed settings", () => {
  it("opens what it sealed, and never stores the plain value", () => {
    withSecret(() => {
      const sealed = sealSecret(KEY);
      assert.match(sealed, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
      assert.ok(!sealed.includes(KEY));
      assert.equal(openSecret(sealed), KEY);
      assert.notEqual(sealSecret(KEY), sealed, "a fresh nonce every time");
    });
  });

  it("refuses a value that was changed or sealed with another secret", () => {
    withSecret(() => {
      const sealed = sealSecret(KEY);
      const [prefix, iv, tag, body] = sealed.split(".");
      const flipped = body.slice(0, -1) + (body.endsWith("A") ? "B" : "A");
      assert.equal(openSecret([prefix, iv, tag, flipped].join(".")), null);
      assert.equal(openSecret("plain text"), null);
      assert.equal(openSecret(undefined), null);
      assert.equal(openSecret(script.sealSecret(KEY, "another secret")), null);
    });
  });

  it("is the same format in the app and in the migration script", () => {
    withSecret(() => {
      assert.equal(openSecret(script.sealSecret(KEY, SECRET)), KEY);
      assert.equal(script.openSecret(sealSecret(KEY), SECRET), KEY);
      assert.equal(script.maskSecret(KEY), maskSecret(KEY));
    });
  });

  it("prefers SETTINGS_SECRET, then ENCRYPTION_KEY, then NEXTAUTH_SECRET", () => {
    assert.equal(script.pickSecret({ NEXTAUTH_SECRET: "c", ENCRYPTION_KEY: "b", SETTINGS_SECRET: "a" })?.name, "SETTINGS_SECRET");
    assert.equal(script.pickSecret({ NEXTAUTH_SECRET: "c", ENCRYPTION_KEY: "b" })?.name, "ENCRYPTION_KEY");
    assert.equal(script.pickSecret({ NEXTAUTH_SECRET: "c" })?.name, "NEXTAUTH_SECRET");
    assert.equal(script.pickSecret({}), null);
  });

  it("shows only the last four characters", () => {
    assert.equal(maskSecret(KEY), "••••cdef");
    assert.equal(maskSecret("short"), "••••");
  });
});

describe("a pasted Nova Poshta key", () => {
  it("is tidied of spaces and line breaks", () => {
    assert.deepEqual(readPastedKey(`  ${KEY}\n`), { ok: true, key: KEY });
    assert.deepEqual(readPastedKey(`${KEY.slice(0, 16)} ${KEY.slice(16)}`), { ok: true, key: KEY });
  });

  it("is refused when it cannot be a key", () => {
    for (const bad of ["", "   ", "ключ", "too-short", `${KEY}!`, undefined, 42, "a".repeat(80)]) {
      assert.equal(readPastedKey(bad).ok, false, String(bad));
    }
  });
});

describe("sender data read from Nova Poshta", () => {
  const ref = "11111111-2222-3333-4444-555555555555";
  const contactRef = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("takes the first sender and its first contact person", () => {
    const sender = readSenderSuggestion(
      [{ Ref: ref, Description: "ФОП Приклад", CounterpartyType: "PrivatePerson" }],
      [{ Ref: contactRef, Description: "Приклад Олена", Phones: "+38 (050) 123-45-67" }],
    );
    assert.deepEqual(sender, { name: "ФОП Приклад", counterpartyRef: ref, contactRef, phone: "380501234567" });
  });

  it("works without a contact person and ignores rows without a code", () => {
    assert.deepEqual(readSenderSuggestion([{ Ref: "" }, { Ref: ref, FirstName: "Олена" }], []), { name: "Олена", counterpartyRef: ref, contactRef: "", phone: "" });
    assert.equal(readSenderSuggestion([], []), null);
    assert.equal(readSenderSuggestion(null, undefined), null);
    assert.equal(readSenderSuggestion([{ Ref: "not-a-code" }], [{ Ref: contactRef }]), null);
  });
});
