"use client";

import { useActionState, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { interpolate } from "@/lib/i18n";
import type { RegistrationErrorCode } from "@/server/intakes/register-candidate";
import { registerAction, type JoinFormState } from "./actions";

export type JoinFormTexts = {
  childName: string;
  childBirthDate: string;
  parentName: string;
  parentContact: string;
  parentContactHint: string;
  consent: string;
  consentNote: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successText: string;
  errors: Record<RegistrationErrorCode, string>;
  codes: Record<NonNullable<JoinFormState["code"]>, string>;
};

export function JoinForm({
  intakeId,
  birthYear,
  texts,
}: {
  intakeId: string;
  birthYear: number;
  texts: JoinFormTexts;
}) {
  const [state, formAction, pending] = useActionState<JoinFormState, FormData>(
    registerAction.bind(null, intakeId),
    { status: "idle" },
  );
  // Controlled fields keep their values when the server rejects the form.
  const [values, setValues] = useState({
    fullName: "",
    birthDate: "",
    parentName: "",
    parentContact: "",
  });
  const [consent, setConsent] = useState(false);
  const set =
    (key: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const message = (code?: RegistrationErrorCode) =>
    code ? interpolate(texts.errors[code], { year: birthYear }) : undefined;

  if (state.status === "success") {
    return (
      <Card role="status" className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight">
          {texts.successTitle}
        </h2>
        <p className="text-ink-muted">{texts.successText}</p>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Input
        label={texts.childName}
        name="fullName"
        autoComplete="off"
        value={values.fullName}
        onChange={set("fullName")}
        error={message(state.errors?.fullName)}
        maxLength={120}
        required
      />
      <Input
        label={texts.childBirthDate}
        name="birthDate"
        type="date"
        value={values.birthDate}
        onChange={set("birthDate")}
        error={message(state.errors?.birthDate)}
        required
      />
      <Input
        label={texts.parentName}
        name="parentName"
        autoComplete="name"
        value={values.parentName}
        onChange={set("parentName")}
        error={message(state.errors?.parentName)}
        maxLength={120}
        required
      />
      <Input
        label={texts.parentContact}
        name="parentContact"
        autoComplete="tel"
        value={values.parentContact}
        onChange={set("parentContact")}
        hint={texts.parentContactHint}
        error={message(state.errors?.parentContact)}
        maxLength={120}
        required
      />

      {/* Hidden from people, tempting for bots: filled means a bot. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={state.errors?.consent ? true : undefined}
            className="mt-0.5 size-6 shrink-0 accent-primary"
          />
          <span>{texts.consent}</span>
        </label>
        <p className="text-xs text-ink-muted">{texts.consentNote}</p>
        {state.errors?.consent ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {message(state.errors.consent)}
          </p>
        ) : null}
      </div>

      {state.code ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {texts.codes[state.code]}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? texts.submitting : texts.submit}
      </Button>
    </form>
  );
}
