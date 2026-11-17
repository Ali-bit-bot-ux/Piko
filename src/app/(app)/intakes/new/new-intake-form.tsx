"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink, Input } from "@/components/ui";
import { ageProfileFor } from "@/lib/age-profile";
import { interpolate } from "@/lib/i18n";
import type { AgeProfile } from "@/generated/prisma/enums";
import type { IntakeErrorCode } from "@/server/intakes/create-intake";
import { createIntakeAction, type IntakeFormState } from "./actions";

export type NewIntakeFormTexts = {
  name: string;
  namePlaceholder: string;
  birthYear: string;
  tryoutDate: string;
  ageProfileHint: string;
  submit: string;
  submitting: string;
  cancel: string;
  errorForbidden: string;
  errors: Record<IntakeErrorCode, string>;
  ageProfiles: Record<AgeProfile, string>;
};

export function NewIntakeForm({
  texts,
  cancelHref,
}: {
  texts: NewIntakeFormTexts;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<
    IntakeFormState,
    FormData
  >(createIntakeAction, {});
  // Controlled fields keep their values when the server rejects the form.
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [tryoutDate, setTryoutDate] = useState("");

  const profile = ageProfileFor(
    Number(birthYear),
    Number(tryoutDate.slice(0, 4)),
  );
  const message = (code?: IntakeErrorCode) =>
    code ? texts.errors[code] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Input
        label={texts.name}
        name="name"
        placeholder={texts.namePlaceholder}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={message(state.errors?.name)}
        maxLength={100}
        required
      />
      <Input
        label={texts.birthYear}
        name="birthYear"
        inputMode="numeric"
        maxLength={4}
        value={birthYear}
        onChange={(event) => setBirthYear(event.target.value)}
        error={message(state.errors?.birthYear)}
        hint={
          profile
            ? interpolate(texts.ageProfileHint, {
                profile: texts.ageProfiles[profile],
              })
            : undefined
        }
        required
      />
      <Input
        label={texts.tryoutDate}
        name="tryoutDate"
        type="date"
        value={tryoutDate}
        onChange={(event) => setTryoutDate(event.target.value)}
        error={message(state.errors?.tryoutDate)}
        required
      />
      {state.forbidden ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {texts.errorForbidden}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink href={cancelHref} variant="ghost">
          {texts.cancel}
        </ButtonLink>
        <Button type="submit" disabled={pending}>
          {pending ? texts.submitting : texts.submit}
        </Button>
      </div>
    </form>
  );
}
