import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './lib/theme-context';

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}