import { Link } from "react-router";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center">
        <h1 className="text-6xl font-semibold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Stránka nenalezena</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Home className="w-5 h-5" />
          Zpět na hlavní stránku
        </Link>
      </div>
    </div>
  );
}
