import { RouterProvider } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="hypo-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
