import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firstProblem,
  hiddenReasons,
  imageUrlProblem,
  moveItem,
  toNumber,
  uploadFailure,
  uploadProblem,
  validateProductDraft,
  type ProductDraft,
} from "../../../components/forms/product-forms/form-logic";

const valid: ProductDraft = {
  name: "Сукня Linnea",
  description: "<p>Легка сукня з льону.</p>",
  url: "",
  price: "2790",
  salePrice: "2190",
  quantity: "9",
  categoryCount: 1,
  params: [{ name: "Розмір", value: "S" }],
};

describe("toNumber", () => {
  it("reads spaces and a decimal comma", () => {
    assert.equal(toNumber("1 299,50"), 1299.5);
    assert.equal(toNumber("2790"), 2790);
  });
  it("is NaN for empty text and words", () => {
    assert.ok(Number.isNaN(toNumber("")));
    assert.ok(Number.isNaN(toNumber("abc")));
  });
});

describe("moveItem", () => {
  it("moves forward and backward without touching the input", () => {
    const list = ["a", "b", "c", "d"];
    assert.deepEqual(moveItem(list, 0, 2), ["b", "c", "a", "d"]);
    assert.deepEqual(moveItem(list, 3, 0), ["d", "a", "b", "c"]);
    assert.deepEqual(list, ["a", "b", "c", "d"]);
  });
  it("clamps the target and ignores a bad source", () => {
    assert.deepEqual(moveItem(["a", "b"], 0, 9), ["b", "a"]);
    assert.deepEqual(moveItem(["a", "b"], 5, 0), ["a", "b"]);
  });
});

describe("validateProductDraft", () => {
  it("accepts a complete product", () => {
    assert.deepEqual(validateProductDraft(valid), {});
  });

  it("reports problems in page order", () => {
    const problems = validateProductDraft({ ...valid, name: "", price: "", categoryCount: 0 });
    assert.equal(firstProblem(problems)?.field, "name");
    assert.ok(problems.price && problems.category);
  });

  it("checks the sale price against the price", () => {
    assert.ok(validateProductDraft({ ...valid, salePrice: "3000" }).priceToShow);
    assert.ok(validateProductDraft({ ...valid, salePrice: "0" }).priceToShow);
    assert.equal(validateProductDraft({ ...valid, salePrice: "" }).priceToShow, undefined);
    assert.equal(validateProductDraft({ ...valid, salePrice: "2790" }).priceToShow, undefined);
  });

  it("wants a whole, non-negative quantity", () => {
    assert.ok(validateProductDraft({ ...valid, quantity: "1.5" }).quantity);
    assert.ok(validateProductDraft({ ...valid, quantity: "-1" }).quantity);
    assert.equal(validateProductDraft({ ...valid, quantity: "0" }).quantity, undefined);
  });

  it("finds half-filled and repeated characteristics", () => {
    assert.ok(validateProductDraft({ ...valid, params: [{ name: "Колір", value: "" }] }).params);
    assert.match(validateProductDraft({ ...valid, params: [{ name: "Колір", value: "синій" }, { name: "колір ", value: "білий" }] }).params ?? "", /двічі/);
  });

  it("checks the supplier link only when there is one", () => {
    assert.ok(validateProductDraft({ ...valid, url: "supplier page" }).url);
    assert.equal(validateProductDraft({ ...valid, url: "https://example.com/item/1" }).url, undefined);
  });

  it("does not count markup as a description", () => {
    assert.ok(validateProductDraft({ ...valid, description: "<p>&nbsp;</p>" }).description);
  });
});

describe("hiddenReasons", () => {
  it("is empty for a product shoppers see", () => {
    assert.deepEqual(hiddenReasons({ isAvailable: true, quantity: 3, categoryCount: 1, imageCount: 1 }), []);
  });
  it("lists every reason", () => {
    assert.equal(hiddenReasons({ isAvailable: false, quantity: 0, categoryCount: 0, imageCount: 0 }).length, 4);
  });
});

describe("photo checks", () => {
  it("refuses other formats and big files before sending", () => {
    assert.match(uploadProblem({ name: "a.pdf", size: 10, type: "application/pdf" }) ?? "", /JPG/);
    assert.match(uploadProblem({ name: "a.jpg", size: 5 * 1024 * 1024, type: "image/jpeg" }) ?? "", /до 4 МБ/);
    assert.equal(uploadProblem({ name: "a.jpg", size: 1000, type: "image/jpeg" }), null);
  });
  it("explains server answers in plain words", () => {
    assert.match(uploadFailure(0), /з’єднання/);
    assert.match(uploadFailure(401), /увійдіть/);
    assert.match(uploadFailure(500), /ще раз/);
  });
  it("accepts only http(s) image links", () => {
    assert.equal(imageUrlProblem("https://cdn.example.com/a.jpg"), null);
    assert.ok(imageUrlProblem("javascript:alert(1)"));
    assert.ok(imageUrlProblem("photo.jpg"));
  });
});
