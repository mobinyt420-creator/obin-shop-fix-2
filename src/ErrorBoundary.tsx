import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#EF4444" }}>Something went wrong.</h1>
          <p style={{ marginTop: "1rem", color: "#374151" }}>Please refresh the page to continue.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", backgroundColor: "#2563EB", color: "white", borderRadius: "0.5rem", border: "none", cursor: "pointer" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
