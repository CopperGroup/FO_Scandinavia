import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillPlan, withinFillHours } from "../photo/filler";
import photoLoader from "../photo/loader";
import { WorkQueue } from "../photo/queue";
import { originalAddress, parsePhotoRequest, parsePhotoSource, photoUrl } from "../photo/request";

const STORED = "https://assets.nordiva.com.ua/nordiva-assets/1794925909684-gille_choklad_750.jpg";
const ask = (query: string, accept: string | null = "image/avif,image/webp,*/*") => parsePhotoRequest(new URLSearchParams(query), accept);

describe("photo addresses", () => {
  it("builds the address next/image asks for and reads it back", () => {
    const address = photoUrl(STORED, 420);
    assert.equal(address, `/img?url=${encodeURIComponent(STORED)}&w=420&q=75`);
    const request = ask(address.split("?")[1]);
    assert.deepEqual(request, { source: { kind: "remote", url: STORED }, width: 420, quality: 75, format: "webp" });
  });

  it("serves only the widths and the quality the pages use", () => {
    assert.equal(ask(`url=${encodeURIComponent(STORED)}&w=421&q=75`), null);
    assert.equal(ask(`url=${encodeURIComponent(STORED)}&w=420&q=74`), null);
    assert.equal(ask(`url=${encodeURIComponent(STORED)}&q=75`), null);
    assert.equal(ask(`url=${encodeURIComponent(STORED)}&w=1920`)?.quality, 75);
  });

  it("gives clients without WebP the photo in its own format", () => {
    assert.equal(ask(`url=${encodeURIComponent(STORED)}&w=420&q=75`, "*/*")?.format, "original");
    assert.equal(ask(`url=${encodeURIComponent(STORED)}&w=420&q=75`, null)?.format, "original");
  });

  it("fetches only from the shop's storage and the sites products were imported from", () => {
    assert.deepEqual(parsePhotoSource("https://content1.rozetka.com.ua/goods/a.jpg"), { kind: "remote", url: "https://content1.rozetka.com.ua/goods/a.jpg" });
    for (const refused of [
      "https://example.com/a.jpg",
      "https://assets.nordiva.com.ua.evil.example/a.jpg",
      "https://rozetka.com.ua.evil.example/a.jpg",
      "http://assets.nordiva.com.ua/a.jpg",
      "https://user:pass@assets.nordiva.com.ua/a.jpg",
      "https://assets.nordiva.com.ua:9000/a.jpg",
      "http://127.0.0.1:9000/a.jpg",
      "http://169.254.169.254/latest/meta-data",
      "ftp://assets.nordiva.com.ua/a.jpg",
      "//assets.nordiva.com.ua/a.jpg",
      "",
    ]) {
      assert.equal(parsePhotoSource(refused), null, refused);
    }
  });

  it("serves pictures of the public folder and nothing else from the site itself", () => {
    assert.deepEqual(parsePhotoSource("/assets/1.jpg"), { kind: "local", path: "/assets/1.jpg" });
    assert.deepEqual(parsePhotoSource("/assets/%D1%84%D0%BE%D1%82%D0%BE.png?v=2"), { kind: "local", path: "/assets/фото.png" });
    for (const refused of ["/assets/../.env.local", "/assets/%2e%2e/secret.jpg", "/.env.local", "/_next/static/a.jpg", "/img/a.jpg", "/api/upload.png", "/admin/a.jpg", "/assets/a.svg", "/assets\\a.jpg", "/assets/a.jpg\u0000.png"]) {
      assert.equal(parsePhotoSource(refused), null, refused);
    }
  });

  it("knows where the uploaded photo is, for the times a resized one cannot be made in time", () => {
    assert.equal(originalAddress({ kind: "remote", url: STORED }), STORED);
    assert.equal(originalAddress({ kind: "local", path: "/assets/1.jpg" }), "/assets/1.jpg");
  });

  it("the loader leaves vector and inline pictures alone and never asks for an unknown quality", () => {
    assert.equal(photoLoader({ src: "/placeholder.svg", width: 420 }), "/placeholder.svg");
    assert.equal(photoLoader({ src: "data:image/png;base64,AAAA", width: 420 }), "data:image/png;base64,AAAA");
    assert.equal(photoLoader({ src: "/assets/1.jpg", width: 640, quality: 90 }), "/img?url=%2Fassets%2F1.jpg&w=640&q=75");
  });
});

describe("resize queue", () => {
  const gate = () => {
    let open = () => {};
    const closed = new Promise<void>((resolve) => (open = resolve));
    return { closed, open };
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

  it("runs one job at a time, in the order they came", async () => {
    const queue = new WorkQueue<string>(1);
    const order: string[] = [];
    let running = 0;
    let most = 0;
    const job = (name: string) => async () => {
      running += 1;
      most = Math.max(most, running);
      order.push(name);
      await tick();
      running -= 1;
      return name;
    };
    const results = await Promise.all(["a", "b", "c", "d"].map((name) => queue.run(name, job(name))));
    assert.deepEqual(results, ["a", "b", "c", "d"]);
    assert.deepEqual(order, ["a", "b", "c", "d"]);
    assert.equal(most, 1);
    assert.equal(queue.size, 0);
  });

  it("does not let a newcomer jump the line when a job finishes", async () => {
    const queue = new WorkQueue<void>(1);
    const first = gate();
    let running = 0;
    let most = 0;
    const counted = (wait: Promise<void>) => async () => {
      running += 1;
      most = Math.max(most, running);
      await wait;
      running -= 1;
    };
    const a = queue.run("a", counted(first.closed));
    const b = queue.run("b", counted(tick().then(() => undefined)));
    first.open();
    await a;
    // "a" has just finished and "b" was handed its place: a job arriving now must wait for "b".
    const c = queue.run("c", counted(Promise.resolve()));
    await Promise.all([b, c]);
    assert.equal(most, 1);
  });

  it("makes the same photo once however many ask for it at the same time", async () => {
    const queue = new WorkQueue<number>(1);
    let made = 0;
    const work = async () => {
      await tick();
      return ++made;
    };
    const [one, two, three] = await Promise.all([queue.run("same", work), queue.run("same", work), queue.run("same", work)]);
    assert.deepEqual([one, two, three], [1, 1, 1]);
    assert.equal(await queue.run("same", work), 2, "a later request makes it again; the caller checks the disk first");
  });

  it("counts what is running and waiting, and a failed job frees its place", async () => {
    const queue = new WorkQueue<string>(1);
    const hold = gate();
    const slow = queue.run("slow", async () => {
      await hold.closed;
      return "slow";
    });
    const failing = queue.run("failing", async () => {
      throw new Error("broken photo");
    });
    const last = queue.run("last", async () => "last");
    assert.equal(queue.size, 3);
    assert.ok(queue.get("failing"));
    hold.open();
    assert.equal(await slow, "slow");
    await assert.rejects(failing, /broken photo/);
    assert.equal(await last, "last");
    assert.equal(queue.size, 0);
    assert.equal(queue.get("failing"), undefined);
  });

  it("makes what a visitor asked for before anything made ahead of time", async () => {
    const queue = new WorkQueue<void>(1);
    const order: string[] = [];
    const hold = gate();
    const job = (name: string, wait: Promise<void> = Promise.resolve()) => async () => {
      await wait;
      order.push(name);
    };
    // One job is running; three made-ahead jobs are in line when two visitors arrive.
    const running = queue.run("ahead-0", job("ahead-0", hold.closed), "background");
    const ahead = ["ahead-1", "ahead-2", "ahead-3"].map((name) => queue.run(name, job(name), "background"));
    const visitors = ["visitor-1", "visitor-2"].map((name) => queue.run(name, job(name), "urgent"));
    assert.equal(queue.urgent, 2);
    assert.equal(queue.size, 6);
    hold.open();
    await Promise.all([running, ...ahead, ...visitors]);
    assert.deepEqual(order, ["ahead-0", "visitor-1", "visitor-2", "ahead-1", "ahead-2", "ahead-3"]);
  });

  it("moves a made-ahead job to the front when a visitor starts waiting for it", async () => {
    const queue = new WorkQueue<string>(1);
    const order: string[] = [];
    const hold = gate();
    const job = (name: string, wait: Promise<void> = Promise.resolve()) => async () => {
      await wait;
      order.push(name);
      return name;
    };
    const running = queue.run("ahead-0", job("ahead-0", hold.closed), "background");
    const first = queue.run("ahead-1", job("ahead-1"), "background");
    const wanted = queue.run("ahead-2", job("ahead-2"), "background");
    // A visitor opens the page that shows the photo of "ahead-2": the same job, now urgent, and not made twice.
    const forVisitor = queue.run("ahead-2", job("never runs"), "urgent");
    assert.equal(forVisitor, wanted);
    assert.equal(queue.urgent, 1);
    hold.open();
    await Promise.all([running, first, wanted]);
    assert.deepEqual(order, ["ahead-0", "ahead-2", "ahead-1"]);
  });

  it("runs two at a time when told to", async () => {
    const queue = new WorkQueue<void>(2);
    let running = 0;
    let most = 0;
    await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        queue.run(String(index), async () => {
          running += 1;
          most = Math.max(most, running);
          await tick();
          running -= 1;
        }),
      ),
    );
    assert.equal(most, 2);
  });
});

describe("photos resized ahead of visitors", () => {
  const A = "https://assets.nordiva.com.ua/nordiva-assets/a.jpg";
  const B = "https://assets.nordiva.com.ua/nordiva-assets/b.jpg";

  it("plans the catalog cards first, then the galleries, each size once", () => {
    const plan = fillPlan([A], [A, B]);
    const sizes = (url: string) => plan.filter((task) => task.url === url).map((task) => task.width);
    // The card photo: card sizes, plus the one gallery size it does not already have.
    assert.deepEqual(sizes(A), [64, 256, 320, 420, 640, 828, 96]);
    assert.deepEqual(sizes(B), [96, 640, 828]);
    assert.equal(plan.findIndex((task) => task.url === B) > plan.findIndex((task) => task.url === A && task.width === 828), true);
    assert.equal(new Set(plan.map((task) => `${task.url}|${task.width}`)).size, plan.length);
  });

  it("keeps to its hours of the Kyiv day when it was given any", () => {
    const hours = (text: string) => /^(\d{1,2})-(\d{1,2})$/.exec(text);
    // 23:30 UTC in November is 01:30 in Kyiv.
    assert.equal(withinFillHours(new Date("2026-11-18T23:30:00Z"), hours("1-7")), true);
    assert.equal(withinFillHours(new Date("2026-11-18T17:00:00Z"), hours("1-7")), false); // 19:00 in Kyiv
    assert.equal(withinFillHours(new Date("2026-11-19T05:00:00Z"), hours("1-7")), false); // 07:00: the end is not included
    assert.equal(withinFillHours(new Date("2026-11-18T21:00:00Z"), hours("22-6")), true); // 23:00, across midnight
    assert.equal(withinFillHours(new Date("2026-11-18T10:00:00Z"), hours("22-6")), false);
    assert.equal(withinFillHours(new Date("2026-11-18T10:00:00Z"), null), true);
  });

  it("leaves out pictures the photo route would refuse", () => {
    assert.deepEqual(fillPlan(["/placeholder.svg", "https://example.com/x.jpg", "", A], []).map((task) => task.url).filter((url, index, all) => all.indexOf(url) === index), [A]);
  });
});
