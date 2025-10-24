import React from 'react';
import toast from '../../services/toastService';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
    try {
      toast.error(error?.message || 'Something went wrong rendering this section.');
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      try { this.props.onRetry(); } catch {}
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>We hit a snag while loading this section.</strong>
            <button onClick={this.handleRetry} style={{ background: '#856404', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Retry</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            {String(this.state.error?.message || 'Unknown error')}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
