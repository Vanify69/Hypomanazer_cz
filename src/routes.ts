import { createElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from './pages/Root';
import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { CaseDetail } from './pages/CaseDetail';
import { NewCase } from './pages/NewCase';
import { Leads } from './pages/Leads';
import { LeadsNew } from './pages/LeadsNew';
import { LeadsEdit } from './pages/LeadsEdit';
import { Referrers } from './pages/Referrers';
import { ReferrersNew } from './pages/ReferrersNew';
import { ReferrersEdit } from './pages/ReferrersEdit';
import { ReferrerLeads } from './pages/ReferrerLeads';
import { RefForm } from './pages/RefForm';
import { RefLeads } from './pages/RefLeads';
import { Settings } from './pages/Settings';
import { CalendarPage } from './pages/CalendarPage';
import { Login } from './pages/Login';
import { Intake } from './pages/Intake';
import { RequireAuth } from './components/RequireAuth';

export const router = createBrowserRouter([
  { path: '/login', Component: Login },
  { path: '/intake/:token', Component: Intake },
  { path: '/ref/:token', Component: RefForm },
  { path: '/ref/:token/leads', Component: RefLeads },
  {
    path: '/',
    Component: RequireAuth,
    children: [
      {
        Component: Root,
        children: [
          { index: true, Component: Dashboard },
          { path: 'cases', Component: Cases },
          { path: 'case/:id', Component: CaseDetail },
          { path: 'new-case', Component: NewCase },
          { path: 'leads', Component: Leads },
          { path: 'leads/new', Component: LeadsNew },
          { path: 'leads/:id/edit', Component: LeadsEdit },
          { path: 'referrers', Component: Referrers },
          { path: 'referrers/new', Component: ReferrersNew },
          { path: 'referrers/:id/edit', Component: ReferrersEdit },
          { path: 'referrers/:id/leads', Component: ReferrerLeads },
          { path: 'calendar', Component: CalendarPage },
          { path: 'settings', Component: Settings },
        ],
      },
    ],
  },
  { path: '*', element: createElement(Navigate, { to: '/', replace: true }) },
]);
