// ── ErrorBoundary ─────────────────────────────────────────────────
// React error boundary that catches rendering errors and shows a
// friendly UI with retry capability.

"use client";

import { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI override */
  fallback?: React.ReactNode;
  /** Optional error callback for logging */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── Component ────────────────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Production-ready minimal logging
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            Something went wrong
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-6">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
