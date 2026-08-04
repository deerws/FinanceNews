from __future__ import annotations

import json
import os

from pywebpush import WebPushException, webpush
from supabase import Client


def notificar_cartas_novas(client: Client, cartas: list[dict]) -> int:
    """Manda push pra quem tem a gestora de cada carta nova nas preferências.

    `cartas` é a lista de payloads recém-upsertados que eram genuinamente
    novos (não existiam antes no Supabase) — inclui gestora_id, titulo,
    gestora_nome e id. Retorna quantas notificações foram enviadas.
    """
    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
    vapid_subject = os.environ.get("VAPID_SUBJECT")
    if not vapid_private_key or not vapid_subject or not cartas:
        return 0

    gestora_ids = list({c["gestora_id"] for c in cartas})
    prefs = (
        client.table("notificacao_gestoras")
        .select("user_id, gestora_id")
        .in_("gestora_id", gestora_ids)
        .execute()
        .data
    )
    if not prefs:
        return 0

    user_ids = list({p["user_id"] for p in prefs})
    subs = (
        client.table("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth_key")
        .in_("user_id", user_ids)
        .execute()
        .data
    )
    subs_by_user: dict[str, list[dict]] = {}
    for s in subs:
        subs_by_user.setdefault(s["user_id"], []).append(s)

    enviadas = 0
    for carta in cartas:
        interessados = {p["user_id"] for p in prefs if p["gestora_id"] == carta["gestora_id"]}
        for user_id in interessados:
            for sub in subs_by_user.get(user_id, []):
                resultado = _enviar_push(sub, carta, vapid_private_key, vapid_subject)
                if resultado is True:
                    enviadas += 1
                elif resultado is None:
                    # subscription expirada/inválida (404/410) — remove pra não tentar de novo
                    client.table("push_subscriptions").delete().eq("id", sub["id"]).execute()
    return enviadas


def _enviar_push(sub: dict, carta: dict, vapid_private_key: str, vapid_subject: str) -> bool | None:
    payload = json.dumps(
        {
            "title": carta.get("gestora_nome") or "Nova carta",
            "body": carta.get("titulo") or "Uma gestora que você segue publicou carta nova.",
            "url": f"/cartas/{carta['id']}",
        }
    )
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth_key"]},
            },
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": vapid_subject},
        )
        return True
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        if status in (404, 410):
            return None
        return False
