import { describe, expect, test } from "bun:test";
import { feedAquisicao, feedNavegacao } from "./opds";

const AGORA = new Date().toISOString();

describe("feedNavegacao", () => {
  test("bem formado, com self/start e entries de subseção", () => {
    const xml = feedNavegacao({
      id: "opds:root",
      title: "FinanceNews",
      updated: AGORA,
      selfHref: "/api/opds",
      entries: [
        { id: "opds:fila", title: "Fila de leitura", updated: AGORA, href: "/api/opds/fila", kind: "acquisition" },
        { id: "opds:gestoras", title: "Por gestora", updated: AGORA, href: "/api/opds/gestoras", kind: "navigation" },
      ],
    });

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('<link rel="self" href="/api/opds" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>');
    expect((xml.match(/<entry>/g) ?? []).length).toBe(2);
    expect(xml).toContain('rel="subsection"');
    expect(xml).toContain('kind=acquisition"/>'); // link da entry "Fila de leitura"
  });

  test("escapa & < > em título", () => {
    const xml = feedNavegacao({
      id: "opds:x",
      title: "Título & <teste>",
      updated: AGORA,
      selfHref: "/api/opds/x",
      entries: [],
    });
    expect(xml).toContain("Título &amp; &lt;teste&gt;");
    expect(xml).not.toContain("<teste>");
  });
});

describe("feedAquisicao", () => {
  test("cada entry tem ao menos 1 link de aquisição", () => {
    const xml = feedAquisicao({
      id: "opds:nao-lidas",
      title: "Não lidas",
      updated: AGORA,
      selfHref: "/api/opds/nao-lidas",
      entries: [
        {
          id: "carta:genoa-2026-06",
          title: "Carta Mensal — Junho 2026",
          updated: AGORA,
          author: "Genoa Capital",
          summary: "Resumo curto",
          aquisicoes: [{ href: "/api/opds/cartas/genoa-2026-06/arquivo", type: "application/pdf" }],
        },
      ],
    });
    expect((xml.match(/<entry>/g) ?? []).length).toBe(1);
    expect((xml.match(/rel="http:\/\/opds-spec\.org\/acquisition"/g) ?? []).length).toBe(1);
    expect(xml).toContain("Genoa Capital");
  });

  test("entry com múltiplos formatos gera múltiplos links de aquisição", () => {
    const xml = feedAquisicao({
      id: "opds:x",
      title: "X",
      updated: AGORA,
      selfHref: "/api/opds/x",
      entries: [
        {
          id: "carta:multi",
          title: "Carta com 2 formatos",
          updated: AGORA,
          aquisicoes: [
            { href: "/a.pdf", type: "application/pdf" },
            { href: "/a.epub", type: "application/epub+zip" },
          ],
        },
      ],
    });
    expect((xml.match(/rel="http:\/\/opds-spec\.org\/acquisition"/g) ?? []).length).toBe(2);
  });

  test("rel=next aparece só quando paginado", () => {
    const semPaginacao = feedAquisicao({ id: "a", title: "a", updated: AGORA, selfHref: "/a", entries: [] });
    const comPaginacao = feedAquisicao({
      id: "a",
      title: "a",
      updated: AGORA,
      selfHref: "/a",
      nextHref: "/a?pagina=2",
      entries: [],
    });
    expect(semPaginacao).not.toContain('rel="next"');
    expect(comPaginacao).toContain('rel="next" href="/a?pagina=2"');
  });
});
