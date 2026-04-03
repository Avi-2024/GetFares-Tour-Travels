import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected error",
    };
  }

  componentDidCatch(error: unknown): void {
    // Keep a console trace for debugging without crashing the UI.
    console.error("CMS UI crashed:", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <div className="max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-400">
              UI Error
            </p>
            <h1 className="text-xl font-semibold">Something went wrong.</h1>
            <p className="text-sm text-slate-400">
              {this.state.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
