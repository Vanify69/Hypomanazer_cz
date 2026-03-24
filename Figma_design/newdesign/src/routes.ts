import { createBrowserRouter } from 'react-router';
import { Root } from './pages/Root';
import { Dashboard } from './pages/Dashboard';
import { DashboardNew } from './pages/DashboardNew';
import { CaseDetail } from './pages/CaseDetail';
import { NewCase } from './pages/NewCase';
import { Settings } from './pages/Settings';
import { Cases } from './pages/Cases';
import { Leads } from './pages/Leads';
import { LeadDetail } from './pages/LeadDetail';
import { NewLead } from './pages/NewLead';
import { Partners } from './pages/Partners';
import { NewPartner } from './pages/NewPartner';
import { Calendar } from './pages/Calendar';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: DashboardNew },
      { path: 'dashboard-old', Component: Dashboard },
      { path: 'cases', Component: Cases },
      { path: 'case/:id', Component: CaseDetail },
      { path: 'new-case', Component: NewCase },
      { path: 'leads', Component: Leads },
      { path: 'lead/:id', Component: LeadDetail },
      { path: 'new-lead', Component: NewLead },
      { path: 'partners', Component: Partners },
      { path: 'new-partner', Component: NewPartner },
      { path: 'calendar', Component: Calendar },
      { path: 'settings', Component: Settings },
    ],
  },
]);