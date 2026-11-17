import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Input,
  ScoreRing,
  StepCard,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "UI kit (dev)",
  robots: { index: false, follow: false },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

// Developer-only page: not available in production builds.
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">UI kit</h1>

      <Section title="Button">
        <div className="flex flex-wrap gap-3">
          <Button>Начать набор</Button>
          <Button variant="accent">Начать бесплатно</Button>
          <Button variant="secondary">Узнать больше</Button>
          <Button variant="ghost">Войти</Button>
          <Button disabled>Недоступно</Button>
          <Button size="lg">Крупная кнопка</Button>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Зачислен</Badge>
          <Badge variant="accent">Резерв</Badge>
          <Badge variant="warning">Повторный просмотр</Badge>
          <Badge variant="danger">Не зачислен</Badge>
          <Badge>Черновик</Badge>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>Обычная карточка</Card>
          <Card variant="muted">Приглушённая</Card>
          <Card variant="dark">Тёмная (таймер)</Card>
        </div>
      </Section>

      <Section title="Input">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Имя ребёнка" placeholder="Например, Алихан" />
          <Input
            label="Телефон родителя"
            type="tel"
            hint="Мы отправим ссылку на отчёт"
          />
          <Input
            label="Год рождения"
            defaultValue="20"
            error="Укажите четыре цифры"
          />
          <Input label="Недоступное поле" disabled />
        </div>
      </Section>

      <Section title="ScoreRing">
        <div className="flex flex-wrap items-end gap-6">
          <ScoreRing label="Итоговая оценка" value={4.35} size="lg" />
          <ScoreRing label="Итоговая оценка" value={3.8} />
          <ScoreRing label="Итоговая оценка" value={2.4} size="sm" />
        </div>
      </Section>

      <Section title="StepCard">
        <ol className="grid gap-4 sm:grid-cols-2">
          <StepCard
            number={1}
            title="Создайте набор"
            description="Название, год рождения и дата испытаний."
          />
          <StepCard
            number={2}
            title="Зарегистрируйте детей"
            description="Родитель сканирует QR-код и заполняет форму."
          />
        </ol>
      </Section>
    </main>
  );
}
