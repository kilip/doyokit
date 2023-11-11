import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
  type WriteFileOptions,
} from "fs";

import path from "path";

export function mkdir(dir: string) {
  mkdirSync(dir, { recursive: true, mode: "0775" });
}

/**
 * Removes directory recursively
 * @param path The directory to removes
 */
export function rmdir(path: string) {
  if (!existsSync(path)) {
    return;
  }

  const files = readdirSync(path);

  files.forEach((file) => {
    const cPath = path + "/" + file;
    if (lstatSync(cPath).isDirectory()) {
      rmdir(cPath);
    } else {
      removeFile(cPath);
    }
  });

  rmdirSync(path);
}

export function removeFile(file: string) {
  unlinkSync(file);
}

export function readFile(file: string, encoding: BufferEncoding = "utf-8") {
  return readFileSync(file, { encoding });
}

export function writeFile(
  file: string,
  contents: string,
  options: WriteFileOptions = { encoding: "utf-8" }
) {
  const dirname = path.dirname(file);

  if (!existsSync(dirname)) {
    mkdir(dirname);
  }

  writeFileSync(file, contents, options);
}

export function readJson(source: string) {
  const contents = readFile(source);
  return JSON.parse(contents.toString());
}
