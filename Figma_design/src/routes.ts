import { createBrowserRouter } from 'react-router';
import { Root } from './pages/Root';
import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { NewCase } from './pages/NewCase';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: 'case/:id', Component: CaseDetail },
      { path: 'new-case', Component: NewCase },
      { path: 'settings', Component: Settings },
    ],
  },
]);
