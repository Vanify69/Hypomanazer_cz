import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import { SystemTray } from "./SystemTray";
import { Minimize2 } from "lucide-react";

export default function Root() {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const handleMinimize = () => {
    setIsMinimized(true);
  };
  
  const handleRestore = () => {
    setIsMinimized(false);
  };
  
  const handleClose = () => {
    if (confirm('Opravdu chcete zavřít aplikaci?')) {
      // In a real Electron app, this would close the window
      alert('Aplikace by byla nyní ukončena');
    }
  };
  
  if (isMinimized) {
    return <SystemTray onRestore={handleRestore} onClose={handleClose} />;
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Minimize button */}
        <button
          onClick={handleMinimize}
          className="fixed top-4 right-4 z-40 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Minimalizovat do systémové lišty"
        >
          <Minimize2 className="w-3 h-3" />
          Minimalizovat
        </button>
        
        <Outlet />
      </main>
    </div>
  );
}