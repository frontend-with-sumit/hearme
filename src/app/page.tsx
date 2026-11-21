import { Button } from "@/components/ui/button";
import { ThemeControl } from "@/components/ui/theme-control";

/** Placeholder home page. Real page content comes from the landing page feature. */
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-16">
      <p className="text-eyebrow text-primary uppercase">HearMe</p>
      <h1 className="text-display font-serif">
        A calm place to <em className="text-primary">be heard.</em>
      </h1>
      <p className="text-lead text-muted-foreground max-w-xl">
        The design system is in place. Pages arrive with the features that need
        them.
      </p>
      <Button size="lg">Book a session</Button>
      <ThemeControl />
    </div>
  );
}
