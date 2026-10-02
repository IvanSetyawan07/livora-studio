import { Component, type ReactNode } from "react";

type State = { hasError: boolean };

/** Mencegah layar putih: tampilkan pesan ramah bila halaman gagal dimuat. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[Livora] Unhandled UI error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md text-center">
          <p className="serif text-2xl font-light uppercase tracking-[0.3em]">Livora</p>
          <h1 className="mt-8 text-xl font-light">Terjadi kesalahan</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Maaf, halaman ini gagal dimuat. Silakan muat ulang, atau kembali ke beranda.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Muat ulang
            </button>
            <a href="/" className="rounded-md border border-border px-5 py-2.5 text-sm transition-colors hover:bg-accent">
              Ke beranda
            </a>
          </div>
        </div>
      </div>
    );
  }
}
