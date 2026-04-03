import Link from "next/link";
import { NewIdeaForm } from "@/components/idea-forms";

export default function NewIdeaPage() {
  return (
    <div>
      <Link
        href="/ideas"
        className="font-mono text-xs uppercase tracking-wider text-muted hover:text-text"
      >
        ← Ideas
      </Link>
      <h1 className="mt-6 font-serif text-3xl text-text">New idea</h1>
      <p className="mt-2 text-sm text-muted">
        Audience and goal must match your database enum values.
      </p>
      <NewIdeaForm />
    </div>
  );
}
