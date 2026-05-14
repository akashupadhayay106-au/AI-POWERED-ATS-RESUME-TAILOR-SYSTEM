/**
 * Dev/preview middleware: GET /api/proxy-jd?url=https://…
 * Fetches public URLs server-side (avoids browser CORS). Basic SSRF guard.
 * @param {string} html
 */
function htmlToPlainText(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<\/(p|div|br|li|h\d)\b>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} target */
function assertFetchableUrl(target) {
  const u = new URL(target);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed.");
  }
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) throw new Error("That host is blocked.");
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || h === "0.0.0.0") {
    throw new Error("Private hosts are blocked.");
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) throw new Error("Private hosts are blocked.");
  if (h === "169.254.169.254") throw new Error("That host is blocked.");
}

/** @param {import("http").IncomingMessage} req */
function targetUrlFromReq(req) {
  const u = new URL(req.url || "", "http://localhost");
  const target = u.searchParams.get("url");
  if (!target) throw new Error("Missing url query parameter.");
  return target;
}

/** @param {import("http").IncomingMessage} req @param {import("http").ServerResponse} res */
async function handleProxy(req, res) {
  try {
    const target = targetUrlFromReq(req);
    assertFetchableUrl(target);

    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "ResumeAI-local-proxy/1.0",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(`Upstream returned ${upstream.status}`);
      return;
    }

    const max = 1_500_000;
    const ct = (upstream.headers.get("content-type") || "").toLowerCase();
    let body = await upstream.text();
    const truncated = body.length > max;
    if (truncated) body = body.slice(0, max);
    if (ct.includes("html")) body = htmlToPlainText(body);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (truncated) res.setHeader("X-ResumeAI-Truncated", "1");
    res.end(body);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(e instanceof Error ? e.message : String(e));
  }
}

export function jdProxyPlugin() {
  return {
    name: "resumeai-jd-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/proxy-jd")) {
          next();
          return;
        }
        void handleProxy(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/proxy-jd")) {
          next();
          return;
        }
        void handleProxy(req, res);
      });
    },
  };
}
