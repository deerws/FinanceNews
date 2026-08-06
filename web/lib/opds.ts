// Builders de feed OPDS 1.2 (perfil Atom). Escritos como template strings
// tipadas de propósito — o formato é simples o suficiente pra não
// justificar puxar uma dependência de XML só pra isso.

const ATOM_NS = "http://www.w3.org/2005/Atom";
const REL_ACQUISITION = "http://opds-spec.org/acquisition";

function tipoFeed(kind: "navigation" | "acquisition"): string {
  return `application/atom+xml;profile=opds-catalog;kind=${kind}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type LinkAquisicao = { href: string; type: string; title?: string };

export type EntryAquisicao = {
  id: string;
  title: string;
  updated: string;
  author?: string;
  summary?: string;
  aquisicoes: LinkAquisicao[];
};

export type EntryNavegacao = {
  id: string;
  title: string;
  updated: string;
  href: string;
  kind: "navigation" | "acquisition";
  content?: string;
};

function entryAquisicaoTag(entry: EntryAquisicao): string {
  const author = entry.author ? `<author><name>${escapeXml(entry.author)}</name></author>` : "";
  const summary = entry.summary ? `<summary>${escapeXml(entry.summary)}</summary>` : "";
  const links = entry.aquisicoes
    .map(
      (l) =>
        `<link rel="${REL_ACQUISITION}" href="${escapeXml(l.href)}" type="${escapeXml(l.type)}"${
          l.title ? ` title="${escapeXml(l.title)}"` : ""
        }/>`,
    )
    .join("\n");
  return `<entry>
<id>${escapeXml(entry.id)}</id>
<title>${escapeXml(entry.title)}</title>
<updated>${entry.updated}</updated>
${author}
${summary}
${links}
</entry>`;
}

function entryNavegacaoTag(entry: EntryNavegacao): string {
  const content = entry.content ? `<content type="text">${escapeXml(entry.content)}</content>` : "";
  return `<entry>
<id>${escapeXml(entry.id)}</id>
<title>${escapeXml(entry.title)}</title>
<updated>${entry.updated}</updated>
${content}
<link rel="subsection" href="${escapeXml(entry.href)}" type="${tipoFeed(entry.kind)}"/>
</entry>`;
}

function feedBase(opts: {
  id: string;
  title: string;
  updated: string;
  selfHref: string;
  kind: "navigation" | "acquisition";
  nextHref?: string;
  body: string;
}): string {
  const tipo = tipoFeed(opts.kind);
  const links = [
    `<link rel="self" href="${escapeXml(opts.selfHref)}" type="${tipo}"/>`,
    `<link rel="start" href="/api/opds" type="${tipoFeed("navigation")}"/>`,
  ];
  if (opts.nextHref) {
    links.push(`<link rel="next" href="${escapeXml(opts.nextHref)}" type="${tipo}"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="${ATOM_NS}">
<id>${escapeXml(opts.id)}</id>
<title>${escapeXml(opts.title)}</title>
<updated>${opts.updated}</updated>
${links.join("\n")}
${opts.body}
</feed>`;
}

export function feedNavegacao(opts: {
  id: string;
  title: string;
  updated: string;
  selfHref: string;
  nextHref?: string;
  entries: EntryNavegacao[];
}): string {
  return feedBase({ ...opts, kind: "navigation", body: opts.entries.map(entryNavegacaoTag).join("\n") });
}

export function feedAquisicao(opts: {
  id: string;
  title: string;
  updated: string;
  selfHref: string;
  nextHref?: string;
  entries: EntryAquisicao[];
}): string {
  return feedBase({ ...opts, kind: "acquisition", body: opts.entries.map(entryAquisicaoTag).join("\n") });
}

export const OPDS_HEADERS_NAVEGACAO = { "Content-Type": tipoFeed("navigation") };
export const OPDS_HEADERS_AQUISICAO = { "Content-Type": tipoFeed("acquisition") };
