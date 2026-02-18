"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}] Caught error:`, error);
    console.error("Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg m-2">
          <h3 className="text-red-400 font-semibold mb-2">
            Component Error {this.props.name && `(${this.props.name})`}
          </h3>
          <p className="text-red-300 text-sm mb-2">
            {this.state.error?.message || "Unknown error"}
          </p>
          {this.state.errorInfo && (
            <details className="text-xs text-red-400/80">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-2 overflow-auto max-h-40 text-[10px]">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="mt-3 px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
