type FeaturePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  id?: string;
};

export function FeaturePanel({
  eyebrow,
  title,
  description,
  accent,
  id,
}: FeaturePanelProps) {
  return (
    <section
      id={id}
      className="glass-panel rounded-[2rem] p-6"
    >
      <div
        aria-hidden
        className="absolute inset-x-6 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
      <p className="text-xs uppercase tracking-[0.32em] text-white/45">{eyebrow}</p>
      <h2 className="mt-4 text-2xl font-semibold leading-tight text-white">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-white/64">{description}</p>
    </section>
  );
}
