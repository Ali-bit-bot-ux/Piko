import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { LoginForm } from "./login-form";

const { login } = getDictionary();

export const metadata: Metadata = {
  title: login.title,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{login.title}</h1>
      <LoginForm
        texts={{
          email: login.email,
          password: login.password,
          submit: login.submit,
          submitting: login.submitting,
          errors: {
            input: login.errorInput,
            invalid: login.errorInvalid,
            throttled: login.errorThrottled,
          },
        }}
      />
    </Card>
  );
}
