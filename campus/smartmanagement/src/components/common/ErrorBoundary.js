import React, { Component } from 'react';

/**
 * Global Error Boundary Component
 * Catches all React render/runtime errors and displays a user-friendly fallback UI.
 * Prevents the entire app from crashing to a red error screen.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Store error details for display
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error details ONLY in development mode
        if (process.env.NODE_ENV === 'development') {
            console.group('🚨 ErrorBoundary Caught an Error');
            console.error('Error:', error);
            console.error('Error Info:', errorInfo);
            console.error('Component Stack:', errorInfo?.componentStack);
            console.groupEnd();
        }
    }

    handleReload = () => {
        // Clear error state and reload the page
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        // Navigate to home page
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Extract safe error message - NEVER show raw objects
            let errorMessage = 'An unexpected error occurred';
            if (this.state.error) {
                if (typeof this.state.error.message === 'string') {
                    errorMessage = this.state.error.message;
                } else if (typeof this.state.error === 'string') {
                    errorMessage = this.state.error;
                }
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
                            <svg
                                className="w-10 h-10 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        {/* Error Title */}
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Oops! Something went wrong
                        </h1>

                        {/* Error Description */}
                        <p className="text-gray-600 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
                        </p>

                        {/* Show error details in development only */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-red-600 break-words">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                style={{ backgroundColor: '#6366f1' }}
                            >
                                🔄 Retry
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                            >
                                🏠 Go Home
                            </button>
                        </div>

                        {/* Support Message */}
                        <p className="mt-6 text-sm text-gray-400">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        // No error - render children normally
        return this.props.children;
    }
}

export default ErrorBoundary;
