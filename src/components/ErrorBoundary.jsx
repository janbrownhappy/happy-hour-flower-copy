import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

// Catches render-time errors in its children and shows a friendly fallback
// instead of letting the whole app go to a black screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorText: error?.message || String(error) };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
    // Record the full stack so the crash can be traced without screenshots
    base44.entities.ClientErrorLog.create({
      message: error?.message || String(error),
      stack: String(error?.stack || '').slice(0, 4000),
      component_stack: String(info?.componentStack || '').slice(0, 4000),
      url: window.location.href,
      user_agent: navigator.userAgent,
    }).catch(() => {});
  }

  // Clear the error when the user navigates elsewhere
  componentDidUpdate(prev) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.reset();
  }

  reset = () => this.setState({ hasError: false, errorText: '' });

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white font-semibold">Something went wrong</p>
          <p className="text-slate-400 text-sm mt-1">
            {this.props.message || 'This section failed to load. Please try again.'}
          </p>
          {this.state.errorText && (
            <p className="text-red-300 text-xs mt-2 font-mono break-all max-w-xl mx-auto allow-select">
              {this.state.errorText}
            </p>
          )}
          <Button onClick={this.reset} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}