import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Check if it's a Firestore error JSON
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.operationType && parsed.authInfo) {
        this.setState({ errorInfo: error.message });
      }
    } catch (e) {
      // Not a JSON error message
    }
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let displayMessage = 'Đã có lỗi xảy ra trong quá trình vận hành ứng dụng.';
      let isPermissionError = false;

      if (this.state.errorInfo) {
        try {
          const parsed = JSON.parse(this.state.errorInfo);
          if (parsed.error.includes('permission-denied') || parsed.error.includes('insufficient permissions')) {
            isPermissionError = true;
            displayMessage = `Bạn không có quyền thực hiện thao tác "${parsed.operationType}" trên đường dẫn "${parsed.path}". Vui lòng liên hệ quản trị viên.`;
          }
        } catch (e) {}
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isPermissionError ? 'Lỗi quyền truy cập' : 'Hệ thống gặp sự cố'}
            </h1>
            
            <p className="text-slate-600 mb-8">
              {displayMessage}
            </p>

            {this.state.error && !isPermissionError && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl text-left border border-slate-100 overflow-hidden">
                <p className="text-xs font-mono text-slate-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <RefreshCw size={18} />
                Thử lại ngay
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-all"
              >
                <Home size={18} />
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
