import React from 'react';
import { AlertCircle, RotateCw, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  copyDebugDetails = () => {
    const { error, errorInfo } = this.state;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    const debugInfo = `
=== ERROR DEBUG DETAILS ===
Route: ${currentPath}
Time: ${new Date().toISOString()}
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}
===========================
    `.trim();

    navigator.clipboard.writeText(debugInfo).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-red-200 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-6 w-6" />
                Something Went Wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                We encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
              </p>
              
              {/* Route info */}
              <div className="p-2 bg-slate-100 rounded text-xs text-slate-600">
                <span className="font-semibold">Route:</span> {currentPath}
              </div>
              
              {/* Error message */}
              <div className="p-3 bg-red-50 rounded border border-red-200 text-sm text-red-700 font-mono">
                {this.state.error?.message || 'Unknown error'}
              </div>
              
              {/* Stack trace (collapsible) */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                  Show stack trace
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-gray-600 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error?.stack || 'No stack trace available'}
                </div>
              </details>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={this.copyDebugDetails} 
                  className="flex-1 gap-2"
                >
                  {this.state.copied ? (
                    <><CheckCircle className="h-4 w-4 text-green-600" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copy Debug Details</>
                  )}
                </Button>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.location.reload()} className="flex-1 gap-2">
                  <RotateCw className="h-4 w-4" />
                  Refresh Page
                </Button>
                <Button onClick={this.reset} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}