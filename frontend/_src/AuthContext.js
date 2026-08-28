import { createContext, useContext, useState } from 'react';
import api from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.tourist));
    setUser(data.tourist);
    return data.tourist;
  }

  async function register(form) {
    const { data } = await api.post('/auth/register', form);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.tourist));
    setUser(data.tourist);
    return data.tourist;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
