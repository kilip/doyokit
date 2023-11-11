import { existsSync } from "fs";
import { beforeAll, describe, expect, it } from "vitest";
import { mkdir, readFile, removeFile, rmdir, writeFile } from "../src/file";

const TARGET = process.cwd() + "/.tmp";

beforeAll(() => {
  rmdir(TARGET + "/.tmp");
});

describe("mkdir()", () => {
  it("should create directory recursively", () => {
    mkdir(TARGET + "/foo/bar");
    expect(existsSync(TARGET + "/foo/bar"));
  });
});

describe("rmdir()", () => {
  it("should removes directory recursively", () => {
    mkdir(TARGET + "/foo/bar/hello/world");

    rmdir(TARGET + "/foo");
    expect(existsSync(TARGET + "/foo")).toBe(false);
  });
});

describe("writeFile()", () => {
  it("should write file", () => {
    const contents = `
    Hello World
    `;
    const targetFile = TARGET + "/test.txt";

    if (existsSync(targetFile)) {
      removeFile(targetFile);
    }
    expect(existsSync(targetFile)).toBe(false);

    writeFile(targetFile, contents);
    expect(existsSync(targetFile)).toBe(true);
    expect(readFile(targetFile)).toEqual(contents);
  });
});
