import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-error-100 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-error-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
                                <p className="text-gray-500 mt-1">An unexpected error occurred</p>
                            </div>
                        </div>

                        {this.state.error && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <p className="text-sm font-mono text-error-600 mb-2">
                                    {this.state.error.toString()}
                                </p>
                                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                                    <details className="mt-2">
                                        <summary className="text-sm text-gray-600 cursor-pointer">Stack trace</summary>
                                        <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-48">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

