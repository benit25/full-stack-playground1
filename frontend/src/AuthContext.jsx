import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from './api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on app start
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (err) {
      console.warn('Error bootstrapping auth', err);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password, name, slug) => {
    try {
      setError(null);
      const response = await authAPI.signup(email, password, name, slug);
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      const { token, user, error: apiError } = response.data;
      
      if (apiError === 'ACCOUNT_SUSPENDED') {
        setError('Your account has been suspended');
        throw new Error('ACCOUNT_SUSPENDED');
      }
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      setUser(user);
      return user;
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setError(null);
    } catch (err) {
      console.warn('Error during logout', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
