import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AuthProvider from '../contexts/AuthContext';
import AuthBoundary from '../components/AuthBoundary';

import AdminBoundary from '../components/AdminBoundary';
import AdminLayout from '../pages/Admin/AdminLayout';
import {
  AdminDashboard,
  AdminCourses,
  AdminSubjects,
  AdminQuestions,
} from '../pages/Admin/AdminPages';

import Login from '../pages/Login/Login';
import Home from '../pages/Home/Home';
import Sala from '../pages/Sala/Sala';

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<AuthBoundary />}>
            <Route path="/home" element={<Home />} />
            <Route path="/sala" element={<Sala />} />
            <Route element={<AdminBoundary />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="cursos" element={<AdminCourses />} />
                <Route path="disciplinas" element={<AdminSubjects />} />
                <Route path="questoes" element={<AdminQuestions />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;
