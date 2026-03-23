import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './guards';
import RoleRoute from './RoleRoute';

// Pages
import Login    from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Goals    from '../pages/Goals';
import GoalDetail from '../pages/GoalDetail';
import Projects from '../pages/Projects';
import ProjectDetail from '../pages/ProjectDetail';
import Tasks    from '../pages/Tasks';
import TaskDetail from '../pages/TaskDetail';
import Notes    from '../pages/Notes';
import NoteDetail from '../pages/NoteDetail';
import Calendar from '../pages/Calendar';
import EventDetail from '../pages/EventDetail';
import Finance  from '../pages/Finance';
import Search   from '../pages/Search';
import Settings from '../pages/Settings';
import Users    from '../pages/Users';
import Email    from '../pages/Email';
import Epic     from '../pages/Epic';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  // Public routes (redirect to /dashboard if already authenticated)
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <Login /> },
    ],
  },

  // Auth-required routes
  {
    element: <ProtectedRoute />,
    children: [
      { index: true, path: '/',          element: <Dashboard /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/goals',     element: <Goals /> },
      { path: '/goals/:id', element: <GoalDetail /> },
      { path: '/projects',  element: <Projects /> },
      { path: '/projects/:id', element: <ProjectDetail /> },
      { path: '/tasks',     element: <Tasks /> },
      { path: '/tasks/:id', element: <TaskDetail /> },
      { path: '/notes',     element: <Notes /> },
      { path: '/notes/:id', element: <NoteDetail /> },
      { path: '/calendar',    element: <Calendar /> },
      { path: '/calendar/:id', element: <EventDetail /> },
      { path: '/finance',   element: <Finance /> },
      { path: '/epic',      element: <Epic /> },
      { path: '/email',     element: <Email /> },
      { path: '/search',    element: <Search /> },
      { path: '/settings',  element: <Settings /> },

      // Owner + Admin only
      {
        element: <RoleRoute allowedRoles={['owner', 'admin']} />,
        children: [
          { path: '/users', element: <Users /> },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFound /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
