import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/accounts/me/');
      setUser(res.data);
      localStorage.setItem('auth_user', JSON.stringify(res.data));
      fetchNotifications();
    } catch (err) {
      // If unauthorized, clear
      if (err.response?.status === 401 || err.response?.status === 403) {
        setUser(null);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/accounts/notifications/');
      const notifs = res.data.results || res.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/accounts/login/', { username, password });
    const { user: userData, token } = res.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    fetchNotifications();
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/accounts/logout/');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setNotifications([]);
  };

  const quickSwitchDemoRole = async (username) => {
    return login(username, 'password123');
  };

  const markNotificationRead = async (id) => {
    try {
      await api.post(`/accounts/notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      // ignore
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.post(`/accounts/notifications/mark-all-read/`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      quickSwitchDemoRole,
      notifications,
      unreadCount,
      fetchNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
