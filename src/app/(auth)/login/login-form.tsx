"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

export type LoginFormTexts = {
  email: string;
  password: string;
  submit: string;
  submitting: string;
  errors: Record<NonNullable<LoginState["error"]>, string>;
};

export function LoginForm({ texts }: { texts: LoginFormTexts }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Input
        label={texts.email}
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <Input
        label={texts.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {texts.errors[state.error]}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? texts.submitting : texts.submit}
      </Button>
    </form>
  );
}
