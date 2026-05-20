/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import Swap from './screens/Swap';
import Vault from './screens/Vault';
import Stocks from './screens/Stocks';
import Fiat from './screens/Fiat';
import Profile from './screens/Profile';
import TaxCalculator from './screens/TaxCalculator';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/fiat" element={<Fiat />} />
          <Route path="/tax" element={<TaxCalculator />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

