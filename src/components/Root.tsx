import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import TrayIcon from "./TrayIcon";

export default function Root() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <TrayIcon />
    </div>
  );
}
