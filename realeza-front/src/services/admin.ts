import { api, type Course } from './api';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export interface AdminCourse extends Course {
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AdminSubject {
  id: string;
  name: string;
  course: AdminCourse;
  semester: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AdminQuestion {
  id: string;
  course: AdminCourse;
  subject: AdminSubject;
  semester: number;
  difficulty: Difficulty;
  statement: string;
  active: boolean;
  options: { id: string; text: string; position: number; isCorrect: boolean }[];
  createdAt: string;
  updatedAt: string;
}
export interface QuestionPage {
  data: AdminQuestion[];
  total: number;
  page: number;
  limit: number;
}
export interface AdminStats {
  courses: number;
  subjects: number;
  questions: number;
}
export function adminApi<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: unknown,
) {
  return api<T>(`/admin${path}`, { method, body, authenticated: true });
}
export function adminQuery(values: Record<string, string | number>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '') query.set(key, String(value));
  });
  return query.toString();
}
