export function SectionHeading({
  eyebrow,
  title,
  text
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-ocean-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-ocean-950 md:text-5xl">{title}</h2>
      {text ? <p className="mt-4 text-lg leading-8 text-ocean-950/65">{text}</p> : null}
    </div>
  );
}
