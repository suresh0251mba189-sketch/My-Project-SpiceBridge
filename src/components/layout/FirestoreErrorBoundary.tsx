import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface FirestoreErrorBoundaryProps {
  children: ReactNode;
}

interface FirestoreErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class FirestoreErrorBoundary extends Component<
  FirestoreErrorBoundaryProps,
  FirestoreErrorBoundaryState
> {
  constructor(props: FirestoreErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): FirestoreErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SpiceBridge ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-red-200 bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h2 className="font-display text-base font-bold text-slate-900">
                  SpiceBridge Runtime Recovery
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  An error interrupted the workspace view. Your local offline cache
                  remains safely preserved in browser storage.
                </p>
              </div>
            </div>

            <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all">
              {this.state.errorMessage}
            </pre>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-800 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reload Workspace View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
