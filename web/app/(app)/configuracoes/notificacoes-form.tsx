"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  salvarPushSubscription,
  removerPushSubscription,
  alternarNotificacaoGestora,
} from "@/lib/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type GestoraOption = { id: string; nome: string };

export function NotificacoesForm({
  gestoras,
  ativasIniciais,
}: {
  gestoras: GestoraOption[];
  ativasIniciais: string[];
}) {
  const [suportado, setSuportado] = useState(true);
  const [inscrito, setInscrito] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [ativas, setAtivas] = useState<Set<string>>(new Set(ativasIniciais));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSuportado(false);
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setInscrito(!!sub);
    });
  }, []);

  async function ativar() {
    setErro(null);
    setCarregando(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setErro("Permissão de notificação negada pelo navegador.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await salvarPushSubscription({ endpoint: json.endpoint, keys: json.keys });
      setInscrito(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ativar notificações.");
    } finally {
      setCarregando(false);
    }
  }

  async function desativar() {
    setCarregando(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removerPushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setInscrito(false);
    } finally {
      setCarregando(false);
    }
  }

  async function toggleGestora(id: string) {
    const novoAtivo = !ativas.has(id);
    const next = new Set(ativas);
    if (novoAtivo) next.add(id);
    else next.delete(id);
    setAtivas(next);
    await alternarNotificacaoGestora(id, novoAtivo);
  }

  if (!suportado) {
    return (
      <p className="text-sm text-muted-foreground">
        Seu navegador não suporta notificações push. No Android, use o Chrome
        (de preferência já instalado como app).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 border p-4">
        <div>
          <p className="font-medium">Notificações no aparelho</p>
          <p className="text-sm text-muted-foreground">
            {inscrito ? "Ativadas neste navegador." : "Desativadas."}
          </p>
        </div>
        <Button
          variant={inscrito ? "secondary" : "default"}
          size="sm"
          disabled={carregando}
          onClick={inscrito ? desativar : ativar}
        >
          {inscrito ? <BellOff /> : <Bell />}
          {inscrito ? "Desativar" : "Ativar"}
        </Button>
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div>
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
          Avisar sobre cartas novas de
        </p>
        <div className="space-y-2">
          {gestoras.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={ativas.has(g.id)}
                onCheckedChange={() => toggleGestora(g.id)}
                disabled={!inscrito}
              />
              {g.nome}
            </label>
          ))}
        </div>
        {!inscrito && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ative as notificações acima primeiro.
          </p>
        )}
      </div>
    </div>
  );
}
