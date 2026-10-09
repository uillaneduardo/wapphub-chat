import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { appRouteDefinitions } from './routes';

const router = createBrowserRouter(appRouteDefinitions);
export function App() { return <RouterProvider router={router} />; }
