// Texto-para-voz via Gemini TTS. Fica desligado até GEMINI_API_KEY ser
// definida (usuário decide quando contratar o serviço) — audioConfigurado()
// é checado antes de qualquer chamada.
const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const GEMINI_TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`;

// Conservador em relação ao limite real da API — evita estourar o limite
// de entrada de um request de TTS numa carta longa.
const MAX_CHARS_POR_TRECHO = 3000;

const SAMPLE_RATE = 24000;
const BITS_POR_AMOSTRA = 16;
const CANAIS = 1;

export function audioConfigurado(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Mesmo split usado no resto do app (extrairSecoes, ConteudoTexto,
// chunk_carta no Python) — blocos separados por linha em branco, "## "
// marca seção. Removemos o marcador pra não ser lido em voz alta.
function limparTexto(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .filter((b) => b.trim())
    .map((b) => (b.trim().startsWith("## ") ? b.trim().slice(3).trim() : b.trim()))
    .join("\n\n");
}

function dividirEmTrechos(texto: string, maxChars: number = MAX_CHARS_POR_TRECHO): string[] {
  const blocos = texto.split(/\n{2,}/).filter((b) => b.trim());
  const trechos: string[] = [];
  let atual = "";
  for (const bloco of blocos) {
    if (atual.length + bloco.length > maxChars && atual) {
      trechos.push(atual);
      atual = "";
    }
    atual += (atual ? "\n\n" : "") + bloco;
  }
  if (atual) trechos.push(atual);
  return trechos;
}

async function gerarPcmTrecho(texto: string): Promise<Buffer> {
  const resp = await fetch(GEMINI_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: texto }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
      },
    }),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new Error(`Gemini TTS respondeu ${resp.status}: ${corpo.slice(0, 300)}`);
  }
  const json = await resp.json();
  const base64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("Resposta do Gemini TTS sem áudio.");
  return Buffer.from(base64, "base64");
}

// A API devolve PCM cru (24kHz, mono, 16 bits) — precisa de um header WAV
// pra tocar direto num <audio>, senão o navegador não reconhece o formato.
function pcmParaWav(pcm: Buffer): Buffer {
  const bytesPorAmostra = BITS_POR_AMOSTRA / 8;
  const blockAlign = CANAIS * bytesPorAmostra;
  const byteRate = SAMPLE_RATE * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(CANAIS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_POR_AMOSTRA, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function gerarAudioCarta(texto: string): Promise<Buffer> {
  const trechos = dividirEmTrechos(limparTexto(texto));
  const partes: Buffer[] = [];
  for (const trecho of trechos) {
    partes.push(await gerarPcmTrecho(trecho));
  }
  return pcmParaWav(Buffer.concat(partes));
}
