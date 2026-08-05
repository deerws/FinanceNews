// Mesmo modelo do lado Python (embeddings.py): multilingual-e5-small, 384
// dimensões. Tem que ser o mesmo modelo dos dois lados pra distância de
// cosseno entre query e carta fazer sentido — e o prefixo "query: " é
// exigido pela convenção do próprio E5, não é estilo nosso.
const MODEL_ID = "Xenova/multilingual-e5-small";

type Extractor = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // /tmp é o único diretório gravável num serverless function da Vercel;
      // sem isso o transformers.js tenta gravar no bundle (read-only) e falha.
      env.cacheDir = "/tmp/transformers-cache";
      return (await pipeline("feature-extraction", MODEL_ID)) as unknown as Extractor;
    })();
  }
  return extractorPromise;
}

export async function embedQuery(texto: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(`query: ${texto}`, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
