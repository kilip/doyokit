import { generateOptions, start, type GeneratorOptions } from "../src";

export const testOptions: GeneratorOptions = generateOptions({
  source: "test/fixtures/books.json",
  targetDir: ".tmp",
  tempDir: ".tmp/temp",
  responseType: "application/json",
});

await start(testOptions);
