import { AuthProvider } from './context/AuthContext';
import AppRouter from './router/index';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
