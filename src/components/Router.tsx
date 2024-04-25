import { lazy } from "react";
import { Outlet, Route, Routes } from "react-router-dom";

import { usePageViews } from "../lib/analytics";
import Layout from "./Layout";
import Login from "../pages/LogIn";
import ResetPassword from "../pages/ResetPassword";
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const Success = lazy(() => import("../pages/Success"));
import Page404 from "../pages/404";
import { useSupportLegacyNRoute } from "../lib/useSupportLegacyNRoute";
import Home from "./page";

export default function Router() {
  usePageViews();
  useSupportLegacyNRoute();
  return (
    <Routes>
      <Route path="/" element={<Wrapper />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/success" element={<Success />} />
        <Route path="*" element={<Page404 />} />
      </Route>
    </Routes>
  );
}

function Wrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
