import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error in React tree:', error, info);
  }

  handleRetry = () => {
    // Simple retry: reload the page to re-run all logic
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="max-w-xl mx-auto p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h2>
            <p className="text-slate-600 mb-6">An unexpected error occurred. You can retry or go back to the home page.</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Retry
              </button>
              <a
                href="/shop"
                className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700"
              >
                Back to Shop
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
