import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";

type FetchLike = (input: string) => Promise<{ status: number; text(): Promise<string> }>;

/** Maps one `KnowledgeSource.id` to its 국가법령정보센터(law.go.kr) 법령일련번호(MST). */
export interface LawGoKrSourceMapping {
  sourceId: string;
  mst: string;
}

const LAW_SERVICE_BASE_URL = "http://www.law.go.kr/DRF/lawService.do";

/**
 * Real {@link KnowledgeSourceConnector} adapter for 국가법령정보센터
 * (law.go.kr) Open API. Given a `KnowledgeSource`, resolves its 법령일련번호
 * (MST) from the constructor-provided mapping, fetches that law's full XML
 * body, and normalizes every `<조문단위>` (article unit) into one {@link
 * ConnectorDocument} — `externalId` is the 조문번호 (article number),
 * `title` is `"<법령명> 제<조문번호>조(<조문제목>)"`, and `text` is the
 * article's own text (`조문내용`) followed by every nested `<항내용>`/
 * `<호내용>` in document order, so multi-paragraph articles are not
 * truncated to their header line.
 *
 * `oc` is the free registration id (`OC` query param) issued by
 * open.law.go.kr; the constant `"test"` is law.go.kr's own published trial
 * value and works without registration for light use. Network access is
 * only exercised by this adapter — the rest of the domain/application layer
 * never depends on it, matching the same optional-real-adapter pattern used
 * by `FetchOpenSearchHttpTransport`/`HttpLanguageModelProvider`.
 *
 * Meant for one-off/manual snapshot fetches (see
 * `runFetchLawKnowledgeSnapshot.ts`), not for live per-request calls from
 * the running host.
 */
export class LawGoKrKnowledgeSourceConnector implements KnowledgeSourceConnector {
  constructor(
    private readonly oc: string,
    private readonly mappings: LawGoKrSourceMapping[],
    private readonly fetchImpl: FetchLike = fetch as FetchLike,
  ) {}

  async fetchDocuments(source: KnowledgeSource): Promise<ConnectorDocument[]> {
    this.assertSource(source);
    const mapping = this.mappings.find((entry) => entry.sourceId === source.id);
    if (!mapping) {
      return [];
    }

    const xml = await this.fetchLawXml(mapping.mst);
    const lawName = this.extractFirst(xml, "법령명_한글") ?? source.name;
    return this.parseArticles(xml, lawName);
  }

  private async fetchLawXml(mst: string): Promise<string> {
    const url = `${LAW_SERVICE_BASE_URL}?OC=${encodeURIComponent(this.oc)}&target=law&MST=${encodeURIComponent(mst)}&type=XML`;
    const response = await this.fetchImpl(url);
    if (response.status !== 200) {
      throw new Error(`law.go.kr lawService.do returned status ${response.status}`);
    }
    return response.text();
  }

  private parseArticles(xml: string, lawName: string): ConnectorDocument[] {
    const blocks = xml.match(/<조문단위[^>]*>[\s\S]*?<\/조문단위>/g) ?? [];
    const documents: ConnectorDocument[] = [];

    for (const block of blocks) {
      const kind = this.extractFirst(block, "조문여부");
      if (kind !== "조문") {
        continue;
      }

      const number = this.extractFirst(block, "조문번호");
      const branch = this.extractFirst(block, "조문가지번호");
      const title = this.extractFirst(block, "조문제목");
      const bodyText = this.extractArticleText(block);
      if (!number || bodyText.trim().length === 0) {
        continue;
      }

      const label = branch ? `${number}의${branch}` : number;
      const articleRef = branch ? `제${number}조의${branch}` : `제${number}조`;
      documents.push({
        externalId: label,
        title: title ? `${lawName} ${articleRef}(${title})` : `${lawName} ${articleRef}`,
        text: bodyText,
      });
    }

    return documents;
  }

  private extractArticleText(block: string): string {
    const parts: string[] = [];
    const tagPattern = /<(조문내용|항내용|호내용)>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/\1>/g;
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(block)) !== null) {
      const text = (match[2] ?? "").trim();
      if (text.length > 0) {
        parts.push(text);
      }
    }
    return parts.join("\n");
  }

  private extractFirst(xml: string, tag: string): string | null {
    const withCdata = new RegExp(`<${tag}>[\\s\\S]*?<!\\[CDATA\\[([\\s\\S]*?)\\]\\][\\s\\S]*?<\\/${tag}>`);
    const withCdataMatch = xml.match(withCdata);
    if (withCdataMatch) {
      return (withCdataMatch[1] ?? "").trim();
    }
    const plain = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`);
    const plainMatch = xml.match(plain);
    return plainMatch ? (plainMatch[1] ?? "").trim() : null;
  }

  private assertSource(source: KnowledgeSource): void {
    if (!source || typeof source !== "object") {
      throw new Error("KnowledgeSource must be an object");
    }
    if (typeof source.id !== "string" || source.id.trim().length === 0) {
      throw new Error("KnowledgeSource.id must be a non-empty string");
    }
  }
}
