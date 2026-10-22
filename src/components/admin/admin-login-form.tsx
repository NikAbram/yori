"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { adminAuthClient } from "@/lib/auth-client";

export function AdminLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    setPending(true);
    setMessage("");

    try {
      const result = await adminAuthClient.signIn.email({
        email,
        password,
        callbackURL: "/admin",
      });

      if (result.error) {
        setMessage(
          result.error.status === 429
            ? "Слишком много попыток. Повторите вход позже."
            : "Не удалось войти. Проверьте данные и повторите попытку.",
        );
        setPending(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Сервис входа временно недоступен. Повторите попытку.");
      setPending(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit} aria-busy={pending}>
      <label htmlFor="admin-email">Электронная почта</label>
      <input
        id="admin-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        maxLength={320}
        required
      />
      <label htmlFor="admin-password">Пароль</label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        minLength={12}
        maxLength={128}
        required
      />
      <p className="admin-form-message" role="status" aria-live="polite">{message}</p>
      <button type="submit" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
