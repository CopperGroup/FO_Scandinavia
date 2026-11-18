/**
 * Runs heavy jobs a few at a time (one, for photo resizing), in two lines:
 *
 *   urgent      someone is waiting for the result (a visitor's browser asked for the photo)
 *   background  nobody is waiting (photos resized ahead of time)
 *
 * Whenever a place frees up, an urgent job takes it; a background job runs
 * only when no urgent job is in line. A background job that someone starts
 * waiting for becomes urgent. The same job never runs twice at once: callers
 * asking for a job that is already waiting or running get that job's result.
 */
export type Priority = "urgent" | "background";

type Waiter = { key: string; start: () => void; priority: Priority };
type Entry<T> = { promise: Promise<T>; priority: Priority };

export class WorkQueue<T> {
  private active = 0;
  private readonly waiting: Waiter[] = [];
  private readonly jobs = new Map<string, Entry<T>>();

  constructor(private readonly concurrency: number) {}

  /** Jobs running or waiting, of both kinds. */
  get size(): number {
    return this.jobs.size;
  }

  /** Urgent jobs running or waiting: what a newly arrived urgent job has ahead of it. */
  get urgent(): number {
    let count = 0;
    this.jobs.forEach((entry) => {
      if (entry.priority === "urgent") count += 1;
    });
    return count;
  }

  /** The job with this key, when it is waiting or running. */
  get(key: string): Promise<T> | undefined {
    return this.jobs.get(key)?.promise;
  }

  run(key: string, work: () => Promise<T>, priority: Priority = "urgent"): Promise<T> {
    const existing = this.jobs.get(key);
    if (existing) {
      if (priority === "urgent") this.promote(key);
      return existing.promise;
    }

    const promise = this.schedule(key, work, priority).finally(() => {
      this.jobs.delete(key);
    });
    this.jobs.set(key, { promise, priority });
    return promise;
  }

  /** Someone is now waiting for a background job: it moves to the urgent line. */
  private promote(key: string): void {
    const entry = this.jobs.get(key);
    if (entry) entry.priority = "urgent";
    const waiter = this.waiting.find((item) => item.key === key);
    if (waiter) waiter.priority = "urgent";
  }

  private async schedule(key: string, work: () => Promise<T>, priority: Priority): Promise<T> {
    if (this.active >= this.concurrency) {
      // The job that finishes hands its place straight to the next one in line.
      await new Promise<void>((start) => this.waiting.push({ key, start, priority }));
    } else {
      this.active += 1;
    }
    try {
      return await work();
    } finally {
      const urgent = this.waiting.findIndex((item) => item.priority === "urgent");
      const next = this.waiting.splice(urgent >= 0 ? urgent : 0, 1)[0];
      if (next) next.start();
      else this.active -= 1;
    }
  }
}
