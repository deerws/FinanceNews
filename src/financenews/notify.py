from __future__ import annotations

import json
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from pywebpush import WebPushException, webpush
from supabase import Client

APP_URL = "https://financenews-app.vercel.app"


def notificar_cartas_novas(client: Client, cartas: list[dict]) -> int:
    """Manda push e/ou e-mail pra quem tem a gestora de cada carta nova nas preferências.

    `cartas` é a lista de payloads recém-upsertados que eram genuinamente
    novos (não existiam antes no Supabase) — inclui gestora_id, titulo,
    gestora_nome e id. Retorna quantas notificações (push + e-mail) foram
    enviadas.
    """
    if not cartas:
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

    gestoras_por_user: dict[str, set[str]] = {}
    for p in prefs:
        gestoras_por_user.setdefault(p["user_id"], set()).add(p["gestora_id"])
    user_ids = list(gestoras_por_user)

    enviadas = 0
    enviadas += _notificar_push(client, cartas, gestoras_por_user, user_ids)
    enviadas += _notificar_email(client, cartas, gestoras_por_user, user_ids)
    return enviadas


def _notificar_push(
    client: Client, cartas: list[dict], gestoras_por_user: dict[str, set[str]], user_ids: list[str]
) -> int:
    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
    vapid_subject = os.environ.get("VAPID_SUBJECT")
    if not vapid_private_key or not vapid_subject:
        return 0

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
        interessados = {uid for uid, gids in gestoras_por_user.items() if carta["gestora_id"] in gids}
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
    except Exception:  # noqa: BLE001 - endpoint morto/rede indisponível não pode derrubar o ingest inteiro
        return False


def _notificar_email(
    client: Client, cartas: list[dict], gestoras_por_user: dict[str, set[str]], user_ids: list[str]
) -> int:
    smtp_email = os.environ.get("SMTP_EMAIL")
    smtp_senha = os.environ.get("SMTP_APP_PASSWORD")
    if not smtp_email or not smtp_senha:
        return 0

    email_prefs = (
        client.table("preferencias_notificacao")
        .select("user_id")
        .in_("user_id", user_ids)
        .eq("email_ativo", True)
        .execute()
        .data
    )
    email_user_ids = {p["user_id"] for p in email_prefs}
    if not email_user_ids:
        return 0

    enviadas = 0
    for user_id in email_user_ids:
        gids = gestoras_por_user.get(user_id, set())
        cartas_usuario = [c for c in cartas if c["gestora_id"] in gids]
        if not cartas_usuario:
            continue
        try:
            destinatario = client.auth.admin.get_user_by_id(user_id).user.email
        except Exception:  # noqa: BLE001 - 1 usuário com lookup falho não pode travar os outros
            continue
        if not destinatario:
            continue
        if _enviar_email(destinatario, cartas_usuario, smtp_email, smtp_senha):
            enviadas += 1
    return enviadas


def _enviar_email(destinatario: str, cartas_usuario: list[dict], smtp_email: str, smtp_senha: str) -> bool:
    linhas = [
        f"- {c.get('gestora_nome') or 'Gestora'}: {c.get('titulo') or 'Nova carta'}\n  {APP_URL}/cartas/{c['id']}"
        for c in cartas_usuario
    ]
    corpo = "Cartas novas das gestoras que você segue:\n\n" + "\n\n".join(linhas) + f"\n\n— FinanceNews\n{APP_URL}"

    msg = MIMEMultipart()
    msg["From"] = smtp_email
    msg["To"] = destinatario
    msg["Subject"] = f"FinanceNews: {len(cartas_usuario)} carta(s) nova(s)"
    msg.attach(MIMEText(corpo, "plain"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(smtp_email, smtp_senha)
            server.sendmail(smtp_email, [destinatario], msg.as_string())
        return True
    except Exception:  # noqa: BLE001 - falha de e-mail não pode derrubar o ingest inteiro
        return False
