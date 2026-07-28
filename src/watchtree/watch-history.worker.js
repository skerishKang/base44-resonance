import { LIMITS } from "./constants.js";
import { detectFormat, parseHtmlText, parseJsonText, WatchHistoryParseError } from "./parser-core.js";

self.onmessage = async (event) => {
  if (event.data?.type === "release") {
    self.close();
    return;
  }
  if (event.data?.type !== "parse") return;

  const file = event.data.file;
  const started = performance.now();
  let bytes = null;
  try {
    if (!(file instanceof Blob)) throw new WatchHistoryParseError("FILE_UNAVAILABLE");
    if (file.size === 0) throw new WatchHistoryParseError("FILE_EMPTY");
    if (file.size > LIMITS.maxFileBytes) {
      throw new WatchHistoryParseError("FILE_TOO_LARGE", { bytes: file.size });
    }
    const format = detectFormat(file.name, file.type);
    if (!format) throw new WatchHistoryParseError("FILE_TYPE_UNSUPPORTED");

    bytes = new Uint8Array(await file.arrayBuffer());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (performance.now() - started > LIMITS.parseBudgetMs) {
      throw new WatchHistoryParseError("PARSER_TIMEOUT");
    }

    const preview = format === "json" ? parseJsonText(text) : parseHtmlText(text);
    if (performance.now() - started > LIMITS.parseBudgetMs) {
      throw new WatchHistoryParseError("PARSER_TIMEOUT");
    }

    const fileSha256 = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    self.postMessage({
      ok: true,
      format,
      fileSha256,
      preview,
      durationMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: {
        code: error?.code ?? (error instanceof TypeError ? "ENCODING_UNSUPPORTED" : "PARSER_FAILED"),
        details: error?.details ?? {},
      },
    });
  } finally {
    bytes?.fill(0);
    bytes = null;
    self.close();
  }
};
