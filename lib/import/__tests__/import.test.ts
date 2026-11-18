import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"

import { detectFields, mapFeed, parseAvailability, parseImages, parseNumber, suggestMapping } from "../mapping"
import { buildPlan, categoryName, withAncestors, type ExistingProduct } from "../plan"
import { DEFAULT_OPTIONS, type FieldMapping, type ParsedFeed } from "../types"
import { checkFeedUrl, isPrivateAddress } from "../url-guard"
import { FeedParseError, decodeXmlBytes, parseFeed } from "../xml"

const SAMPLE = path.join(process.cwd(), "public", "samples", "nordiva-sample-feed.xml")

/* --------------------------------- parser --------------------------------- */

describe("parseFeed", () => {
  it("reads a YML price list: shop, categories, offers, params", () => {
    const feed = parseFeed(`<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-01-14 15:41">
  <shop>
    <name>Тест &amp; Ко</name>
    <categories>
      <category id="1">Одяг</category>
      <category id="2" parentId="1">Сукні</category>
    </categories>
    <offers>
      <offer id="A-1" available="true">
        <name>Сукня &quot;Лілія&quot;</name>
        <price>1 299,50</price>
        <picture>https://img.test/1.jpg</picture>
        <picture>https://img.test/2.jpg</picture>
        <description><![CDATA[<p>Опис <b>жирний</b></p>]]></description>
        <param name="Розмір">M</param>
        <param name="Вага" unit="г">500</param>
        <param name="Порожній"/>
      </offer>
    </offers>
  </shop>
</yml_catalog>`)

    assert.equal(feed.format, "yml")
    assert.equal(feed.recordTag, "offer")
    assert.equal(feed.shopName, "Тест & Ко")
    assert.equal(feed.date, "2026-01-14 15:41")
    assert.deepEqual(feed.categories, [
      { id: "1", parentId: null, name: "Одяг" },
      { id: "2", parentId: "1", name: "Сукні" },
    ])
    assert.equal(feed.offers.length, 1)
    const [offer] = feed.offers
    assert.deepEqual(offer.attrs, { id: "A-1", available: "true" })
    assert.deepEqual(offer.fields.name, ['Сукня "Лілія"'])
    assert.deepEqual(offer.fields.picture, ["https://img.test/1.jpg", "https://img.test/2.jpg"])
    assert.equal(offer.fields.description[0], "<p>Опис <b>жирний</b></p>")
    assert.deepEqual(offer.params, [
      { name: "Розмір", value: "M" },
      { name: "Вага", value: "500", unit: "г" },
      { name: "Порожній", value: "" },
    ])
  })

  it("keeps raw HTML inside a description and survives unclosed tags in it", () => {
    const feed = parseFeed(`<offers><offer id="1"><name>X</name><description><p>Рядок<br>далі</p></description><price>10</price></offer></offers>`)
    assert.equal(feed.offers[0].fields.description[0], "<p>Рядок<br>далі</p>")
    assert.deepEqual(feed.offers[0].fields.price, ["10"])
  })

  it("handles attributes containing > and single quotes, and numeric entities", () => {
    const feed = parseFeed(`<offers><offer id='a>b' available="false"><name>&#1058;&#x435;ст</name></offer></offers>`)
    assert.deepEqual(feed.offers[0].attrs, { id: "a>b", available: "false" })
    assert.deepEqual(feed.offers[0].fields.name, ["Тест"])
  })

  it("ignores a duplicated category id and a category that is its own parent", () => {
    const feed = parseFeed(`<shop><categories>
      <category id="c1">Спорт</category>
      <category id="c2" parentId="c2">Туризм</category>
      <category id="c1" parentId="c2">Дубль</category>
    </categories><offers><offer id="1"><name>A</name></offer></offers></shop>`)
    assert.deepEqual(feed.categories, [
      { id: "c1", parentId: null, name: "Спорт" },
      { id: "c2", parentId: null, name: "Туризм" },
    ])
    assert.ok(feed.warnings.some((warning) => warning.includes("c1")))
  })

  it("accepts <item> records in a generic feed", () => {
    const feed = parseFeed(`<catalog><item><sku>S1</sku><title>A</title></item><item><sku>S2</sku><title>B</title></item></catalog>`)
    assert.equal(feed.format, "generic")
    assert.equal(feed.recordTag, "item")
    assert.equal(feed.offers.length, 2)
  })

  it("refuses non-XML and feeds without products", () => {
    assert.throws(() => parseFeed("<!doctype html>"), FeedParseError)
    assert.throws(() => parseFeed("{ \"a\": 1 }"), FeedParseError)
    assert.throws(() => parseFeed("<root><a/></root>"), FeedParseError)
  })

  it("warns about a file cut off in the middle of a record", () => {
    const feed = parseFeed(`<offers><offer id="1"><name>A</name></offer><offer id="2"><name>B</name>`)
    assert.equal(feed.offers.length, 1)
    assert.equal(feed.warnings.length, 1)
  })

  it("decodes windows-1251 when the declaration says so", () => {
    const bytes = new Uint8Array([
      ...Buffer.from('<?xml version="1.0" encoding="windows-1251"?><offers><offer id="1"><name>', "latin1"),
      0xd1, 0xf3, 0xea, 0xed, 0xff, // "Сукня"
      ...Buffer.from("</name></offer></offers>", "latin1"),
    ])
    assert.deepEqual(parseFeed(decodeXmlBytes(bytes)).offers[0].fields.name, ["Сукня"])
  })

  it("reads the bundled sample feed", () => {
    const feed = parseFeed(fs.readFileSync(SAMPLE, "utf8"))
    assert.equal(feed.format, "yml")
    assert.equal(feed.offers.length, 40)
    assert.equal(feed.categories.length, 14)
    assert.ok(feed.offers.every((offer) => offer.attrs.id.startsWith("sample-")))
    assert.ok(feed.categories.every((category) => category.id.startsWith("sample-")))
  })
})

/* --------------------------------- mapping -------------------------------- */

describe("mapping", () => {
  it("parses prices, availability and image lists", () => {
    assert.equal(parseNumber("1 299,50"), 1299.5)
    assert.equal(parseNumber("1.299,50 грн"), 1299.5)
    assert.equal(parseNumber("2973"), 2973)
    assert.ok(Number.isNaN(parseNumber("")))
    assert.equal(parseAvailability("true"), true)
    assert.equal(parseAvailability("Ні"), false)
    assert.equal(parseAvailability(""), null)
    assert.deepEqual(parseImages(["https://a.test/1.jpg, https://a.test/2.jpg", " https://a.test/ 3.jpg", "/assets/x.jpg", "ftp://bad", "https://a.test/1.jpg"]), [
      "https://a.test/1.jpg",
      "https://a.test/2.jpg",
      "https://a.test/3.jpg",
      "/assets/x.jpg",
    ])
  })

  it("uses vendorCode as the article when every offer has one, the offer id otherwise", () => {
    const withCodes = parseFeed(`<offers><offer id="1"><vendorCode>V-1</vendorCode><name>A</name><price>1</price></offer><offer id="2"><vendorCode>V-2</vendorCode><name>B</name><price>1</price></offer></offers>`)
    assert.equal(suggestMapping(detectFields(withCodes.offers)).articleNumber, "vendorCode")

    // The store's own feeds carry the article in the offer id (FS611203-XS) and have no vendorCode.
    const store = parseFeed(`<offers><offer id="FS611203-XS" available="true"><name>A</name><price>2973</price><stock_quantity>10</stock_quantity><categoryId>7333382</categoryId></offer></offers>`)
    const mapping = suggestMapping(detectFields(store.offers))
    assert.equal(mapping.articleNumber, "@id")
    assert.equal(mapping.quantity, "stock_quantity")
    assert.equal(mapping.available, "@available")
    assert.equal(mapping.category, "categoryId")
  })

  it("maps the sample feed without any manual changes and flags the three broken records", () => {
    const feed = parseFeed(fs.readFileSync(SAMPLE, "utf8"))
    const mapping = suggestMapping(detectFields(feed.offers))
    assert.equal(mapping.articleNumber, "vendorCode")
    assert.equal(mapping.oldPrice, "oldprice")
    assert.equal(mapping.images, "picture")

    const items = mapFeed(feed, mapping, 10)
    const broken = items.filter((item) => item.problems.length > 0)
    assert.deepEqual(
      broken.map((item) => item.problems[0].split(" ")[0] + " " + item.problems[0].split(" ")[1]),
      ["Немає ціни", "Немає назви", "Повторюється артикул"],
    )

    const dress = items.find((item) => item.key === "SAMPLE-10101-XS")!
    assert.equal(dress.priceToShow, 2190)
    assert.equal(dress.price, 2790)
    assert.equal(dress.categoryExternalId, "sample-women-dresses")
    assert.deepEqual(dress.params.map((param) => param.name), ["Розмір", "Колір", "Матеріал", "Країна-виробник"])

    const sweets = items.find((item) => item.key === "SAMPLE-60303")!
    assert.equal(sweets.isAvailable, false)
    assert.equal(sweets.quantity, 0)
    const coffee = items.find((item) => item.key === "SAMPLE-60404")!
    assert.equal(coffee.quantity, 10, "no stock_quantity in the feed: the default quantity")
  })

  it("adds the unit to a param value and drops empty or repeated params", () => {
    const feed = parseFeed(`<offers><offer id="1"><name>A</name><price>5</price><param name="Вага" unit="г">500</param><param name="Вага" unit="г">500</param><param name="X"></param></offer></offers>`)
    const [item] = mapFeed(feed, suggestMapping(detectFields(feed.offers)), 10)
    assert.deepEqual(item.params, [{ name: "Вага", value: "500 г" }])
  })
})

/* ---------------------------------- plan ---------------------------------- */

const MAPPING: FieldMapping = {
  articleNumber: "@id",
  name: "name",
  price: "price",
  oldPrice: "oldprice",
  vendor: "vendor",
  category: "categoryId",
  images: "picture",
  description: "description",
  available: "@available",
  quantity: "stock_quantity",
  url: "",
  params: true,
}

function feedOf(xml: string): ParsedFeed {
  return parseFeed(`<yml_catalog><shop><categories>
    <category id="root">Одяг</category>
    <category id="leaf" parentId="root">Сукні</category>
    <category id="other">Інше</category>
  </categories><offers>${xml}</offers></shop></yml_catalog>`)
}

function existing(overrides: Partial<ExistingProduct>): ExistingProduct {
  return {
    _id: "p1",
    articleNumber: "A-1",
    name: "Сукня",
    price: 100,
    priceToShow: 100,
    isAvailable: true,
    quantity: 3,
    images: ["https://img.test/1.jpg"],
    vendor: "Brand",
    description: "",
    url: "",
    params: [],
    category: ["cat-leaf"],
    isFetched: true,
    ...overrides,
  }
}

const OFFER_A1 = `<offer id="A-1" available="true"><name>Сукня</name><price>100</price><vendor>Brand</vendor><categoryId>leaf</categoryId><picture>https://img.test/1.jpg</picture><stock_quantity>3</stock_quantity></offer>`

describe("buildPlan", () => {
  function plan(feed: ParsedFeed, products: ExistingProduct[], options = DEFAULT_OPTIONS, excluded: number[] = [], fetched = products) {
    const items = mapFeed(feed, MAPPING, options.defaultQuantity)
    const byArticle = new Map<string, ExistingProduct[]>()
    for (const product of products) byArticle.set(product.articleNumber, [...(byArticle.get(product.articleNumber) ?? []), product])
    return buildPlan({
      items,
      excludedLines: new Set(excluded),
      existingByArticle: byArticle,
      existingCategories: new Map([["leaf", { _id: "cat-leaf", externalId: "leaf", name: "Сукні" }]]),
      feedCategories: feed.categories,
      fetchedProducts: fetched.map(({ _id, articleNumber, name }) => ({ _id, articleNumber, name })),
      mapping: MAPPING,
      options,
    })
  }

  it("marks an identical product as unchanged, so importing the same file twice writes nothing", () => {
    const result = plan(feedOf(OFFER_A1), [existing({})])
    assert.equal(result.decisions[0].status, "same")
    assert.deepEqual(result.decisions[0].updates, [])
    assert.equal(result.categoriesToCreate.length, 0)
  })

  it("lists only the fields that change", () => {
    const result = plan(feedOf(OFFER_A1.replace("<price>100</price>", "<price>90</price><oldprice>120</oldprice>")), [existing({})])
    assert.equal(result.decisions[0].status, "update")
    assert.deepEqual(result.decisions[0].updates[0].set, { priceToShow: 90, price: 120 })
    assert.deepEqual(result.decisions[0].changes.sort(), ["ціна", "стара ціна"].sort())
  })

  it("leaves the category of existing products alone unless asked", () => {
    const moved = feedOf(OFFER_A1.replace("<categoryId>leaf</categoryId>", "<categoryId>other</categoryId>"))
    assert.equal(plan(moved, [existing({})]).decisions[0].status, "same")
    const result = plan(moved, [existing({})], { ...DEFAULT_OPTIONS, categories: "feed" })
    assert.deepEqual(result.decisions[0].updates[0].set, { category: ["new:other"] })
    assert.deepEqual(result.categoriesToCreate.map((category) => category.id), ["other"])
  })

  it("creates new products' categories with their parents, parents first", () => {
    const result = plan(feedOf(`<offer id="B-1"><name>Нова</name><price>10</price><categoryId>leaf</categoryId></offer>`), [])
    assert.equal(result.decisions[0].status, "new")
    // "leaf" exists already; "root" is its ancestor and is not needed for an existing leaf.
    assert.deepEqual(result.categoriesToCreate.map((category) => category.id), ["root"])
    const fresh = plan(feedOf(`<offer id="B-1"><name>Нова</name><price>10</price><categoryId>other</categoryId></offer>`), [])
    assert.deepEqual(fresh.summary.newCategories.map((node) => node.name), ["Інше"])
  })

  it("skips broken and excluded records with a reason, and counts them", () => {
    const feed = feedOf(`${OFFER_A1}<offer id="C-1"><name>Без ціни</name></offer><offer id="A-1"><name>Дубль</name><price>5</price></offer><offer id="D-1"><name>Вручну</name><price>5</price></offer>`)
    const result = plan(feed, [existing({})], DEFAULT_OPTIONS, [4])
    assert.deepEqual(
      result.decisions.map((decision) => decision.status),
      ["same", "skip", "skip", "skip"],
    )
    assert.equal(result.decisions[3].reasons[0], "Виключено вручну")
    assert.equal(result.summary.counts.skip, 3)
  })

  it("updates every duplicate already in the database", () => {
    const result = plan(feedOf(OFFER_A1.replace("<price>100</price>", "<price>80</price>")), [existing({ _id: "p1" }), existing({ _id: "p2" })])
    assert.deepEqual(result.decisions[0].updates.map((update) => update._id), ["p1", "p2"])
  })

  it("finds earlier imports that are no longer in the feed, counting skipped records as present", () => {
    const feed = feedOf(`${OFFER_A1}<offer id="E-1"><name>Без ціни</name></offer>`)
    const fetched = [existing({}), existing({ _id: "p9", articleNumber: "E-1" }), existing({ _id: "p10", articleNumber: "GONE-1", name: "Зник" })]
    const result = plan(feed, [existing({})], DEFAULT_OPTIONS, [], fetched)
    assert.deepEqual(result.missing.map((product) => product.articleNumber), ["GONE-1"])
    assert.equal(result.summary.missing.count, 1)
  })

  it("gives a back-in-stock product the default quantity when the feed has no quantity", () => {
    const mapping = { ...MAPPING, quantity: "" }
    const feed = feedOf(OFFER_A1)
    const items = mapFeed(feed, mapping, 7)
    const result = buildPlan({
      items,
      excludedLines: new Set(),
      existingByArticle: new Map([["A-1", [existing({ quantity: 0 })]]]),
      existingCategories: new Map([["leaf", { _id: "cat-leaf", externalId: "leaf", name: "Сукні" }]]),
      feedCategories: feed.categories,
      fetchedProducts: [],
      mapping,
      options: { ...DEFAULT_OPTIONS, defaultQuantity: 7 },
    })
    assert.deepEqual(result.decisions[0].updates[0].set, { quantity: 7 })
  })
})

describe("categories", () => {
  it("orders ancestors first and survives cycles", () => {
    const categories = [
      { id: "a", parentId: "c", name: "A" },
      { id: "b", parentId: "a", name: "B" },
      { id: "c", parentId: "b", name: "C" },
    ]
    const ordered = withAncestors(["b"], categories).map((category) => category.id)
    assert.equal(ordered.length, 3)
    assert.equal(new Set(ordered).size, 3)
  })

  it("never names a category with a bare database id", () => {
    assert.equal(categoryName({ id: "c9", parentId: null, name: "6a4230d286fbd1310ce992cd" }), "Категорія c9")
    assert.equal(categoryName({ id: "c9", parentId: null, name: "  " }), "Категорія c9")
    assert.equal(categoryName({ id: "c9", parentId: null, name: " Сукні " }), "Сукні")
  })
})

/* -------------------------------- url guard ------------------------------- */

describe("feed URL guard", () => {
  it("blocks private, loopback and link-local addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1"]) {
      assert.equal(isPrivateAddress(ip), true, ip)
    }
    for (const ip of ["8.8.8.8", "185.199.108.153", "2606:4700:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip)
  })

  it("accepts public http(s) URLs only", () => {
    assert.equal(checkFeedUrl("https://supplier.example.com/feed.xml").ok, true)
    for (const url of [
      "http://localhost:3000/feed.xml",
      "http://127.0.0.1/feed.xml",
      "http://2130706433/feed.xml",
      "http://[::1]/feed.xml",
      "http://printer.local/feed.xml",
      "http://intranet/feed.xml",
      "file:///etc/passwd",
      "ftp://example.com/feed.xml",
      "https://user:pass@example.com/feed.xml",
      "not a url",
    ]) {
      assert.equal(checkFeedUrl(url).ok, false, url)
    }
  })
})
