import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorDisplay: React.FC<{ onRefresh: () => void; onGoHome: () => void; error?: Error | null; errorInfo?: ErrorInfo | null }> = ({ onRefresh, onGoHome, error, errorInfo }) => {
  const { t } = useTranslation('common');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
          {t('error.title')}
        </h1>
        
        {/* Description */}
        <p className="text-gray-500 mb-8">
          {t('error.description')}
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
          >
            <RefreshCw size={18} />
            {t('error.refreshPage')}
          </button>
          <button
            onClick={onGoHome}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            <Home size={18} />
            {t('error.goToHome')}
          </button>
        </div>
        
        {/* Error Details (collapsed by default in production) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
              {t('error.technicalDetails')}
            </summary>
            <div className="mt-4 p-4 bg-gray-100 rounded-xl overflow-auto max-h-48">
              <p className="text-xs font-mono text-red-600 whitespace-pre-wrap">
                {error.toString()}
              </p>
              {errorInfo && (
                <p className="text-xs font-mono text-gray-500 mt-2 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </p>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.hash = '#home';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          onRefresh={this.handleRefresh}
          onGoHome={this.handleGoHome}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
