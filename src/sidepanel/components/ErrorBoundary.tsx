import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Sidepanel-level error boundary. If a route throws during render the side
 * panel would otherwise go blank with no way to recover except reloading the
 * extension. We catch and offer a Reload button. We do not phone home; this
 * stays a local-only product.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep this in console only. Telemetry is forbidden by project policy.
    if (typeof console !== 'undefined') {
      console.error('Barq Minutes render error', error, info);
    }
  }

  private handleReload = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <main className="app-main">
            <div className="card" style={{ borderColor: '#b3261e' }}>
              <h2>Something went wrong</h2>
              <p className="muted">
                {this.state.error.message || 'An unexpected error occurred while rendering.'}
              </p>
              <button type="button" className="primary-button" onClick={this.handleReload}>
                Try again
              </button>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
