import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // onnxruntime-node (usado por @huggingface/transformers na busca
  // semântica) tem um binário nativo (.so) carregado dinamicamente que o
  // file tracing da Vercel não detecta sozinho — sem isso a função
  // serverless sobe sem o binário e a busca semântica quebra em produção
  // com "libonnxruntime.so.1: cannot open shared object file".
  outputFileTracingIncludes: {
    "/": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
