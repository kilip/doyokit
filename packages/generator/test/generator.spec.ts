import { Doyokit } from "@doyokit/core";
import fetchMock from "fetch-mock";
import { describe, expect, it } from "vitest";
import restPlugin from "../.tmp/plugin";

const Api = Doyokit.plugin(restPlugin);
type Api = InstanceType<typeof Api>;

describe("test generated types", () => {
  it("should handle request", async () => {
    const expected = { hello: "world" };
    fetchMock.post(
      {
        url: "path:/admin/books",
      },
      {
        status: 200,
        body: expected,
      }
    );
    const api = new Api({
      baseUrl: "http://example.com",
    });
    const { data, status, headers, url } = await api.admin.books.create({
      book: "foobar",
      condition: "https://schema.org/NewCondition",
    });
    expect(status).toBe(200);
    expect(data).toEqual(expected);
  });
});
