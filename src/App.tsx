import { useState, type FC } from 'react';
import type { ToolRequest, AIAnalysis, RequestStatus } from './types';
import { useRequests } from './hooks/useRequests';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import RequestForm from './components/request/RequestForm';
import RequestModal from './components/modal/RequestModal';
import ToolDatabase from './components/tooldb/ToolDatabase';

type View = 'dashboard' | 'new-request' | 'tool-database';

const App: FC = () => {
  const { requests, addRequest, updateStatus, setAIAnalysis } = useRequests();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedRequest, setSelectedRequest] = useState<ToolRequest | null>(null);
  const [openWithReject, setOpenWithReject] = useState(false);

  function handleAddRequest(req: ToolRequest) {
    addRequest(req);
    setActiveView('dashboard');
  }

  function handleUpdateStatus(id: string, status: RequestStatus, reason?: string) {
    updateStatus(id, status, reason);
    setSelectedRequest((prev) =>
      prev?.id === id
        ? {
            ...prev,
            status,
            reason: reason ?? prev.reason,
            resolvedAt:
              status === 'Approved' || status === 'Rejected'
                ? new Date().toISOString()
                : prev.resolvedAt,
          }
        : prev,
    );
  }

  function handleSetAIAnalysis(id: string, analysis: AIAnalysis) {
    setAIAnalysis(id, analysis);
    setSelectedRequest((prev) => (prev?.id === id ? { ...prev, aiAnalysis: analysis } : prev));
  }

  function handleRowView(req: ToolRequest) {
    setOpenWithReject(false);
    setSelectedRequest(req);
  }

  function handleRowApprove(req: ToolRequest) {
    updateStatus(req.id, 'Approved');
  }

  function handleRowReject(req: ToolRequest) {
    setOpenWithReject(true);
    setSelectedRequest(req);
  }

  function handleModalClose() {
    setSelectedRequest(null);
    setOpenWithReject(false);
  }

  return (
    <div className="flex min-h-screen bg-[#0c0e14]">
      <Sidebar
        activeView={activeView}
        onNavigate={(v) => setActiveView(v as View)}
        requests={requests}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {activeView === 'dashboard' && (
          <Dashboard
            requests={requests}
            onRowView={handleRowView}
            onRowApprove={handleRowApprove}
            onRowReject={handleRowReject}
            onNewRequest={() => setActiveView('new-request')}
          />
        )}

        {activeView === 'new-request' && (
          <RequestForm
            onSubmit={handleAddRequest}
            onCancel={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'tool-database' && <ToolDatabase />}
      </main>

      {selectedRequest && (
        <RequestModal
          req={selectedRequest}
          onClose={handleModalClose}
          onUpdateStatus={handleUpdateStatus}
          onSetAIAnalysis={handleSetAIAnalysis}
          initialShowReject={openWithReject}
        />
      )}
    </div>
  );
};

export default App;
