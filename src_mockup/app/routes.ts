import { createBrowserRouter } from "react-router";
import MainLayout from "./components/MainLayout";
import NotFound from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);