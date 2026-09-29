import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTab?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in tab component:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-red-200 shadow-sm my-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
            हे पेज उघडताना त्रुटी आली / Something went wrong loading this screen
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6">
            या घटकातील डेटा लोड करताना तांत्रिक अडचण आली आहे. कृपया खालील बटणावर क्लिक करून स्क्रीन रिसेट करा किंवा डॅशबोर्डवर जा.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>पुन्हा प्रयत्न करा (Retry)</span>
            </button>

            <button
              onClick={() => {
                this.handleReset();
                window.location.reload();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 border border-slate-300"
            >
              <Home className="w-4 h-4" />
              <span>पेज रीलोड करा (Reload Page)</span>
            </button>
          </div>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div className="mt-6 text-left w-full max-w-xl p-3 bg-slate-900 text-red-300 font-mono text-[11px] rounded-lg overflow-x-auto">
              <p className="font-bold">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
