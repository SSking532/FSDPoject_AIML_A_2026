import React, { createContext, useContext, useEffect, useState } from 'react';
import { INITIAL_USERS } from '../data/mockData';
import { TOKEN_STORAGE_KEY, USE_MOCK_DATA } from '../services/api';
import { authService } from '../services/authService';
import { wsService } from '../services/wsService';

const AUTH_USER_KEY = 'smart_ambulance_user';
const REGISTERED_USERS_KEY = 'smart_ambulance_registered_users';
export const DEMO_PASSWORD = 'demo1234';
const MOCK_ADMIN_CODE = 'DISPATCH-2026';

const AuthContext = createContext(null);

export function getDashboardRoute(role) {
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'driver') return '/driver/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/login';
}

function loadRegisteredMockUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return INITIAL_USERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const storedToken =
          localStorage.getItem(TOKEN_STORAGE_KEY) ||
          sessionStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser =
          localStorage.getItem(AUTH_USER_KEY) ||
          sessionStorage.getItem(AUTH_USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (!USE_MOCK_DATA) {
            const freshUser = await authService.getCurrentUser();
            if (active && freshUser) {
              setUser(freshUser);
              wsService.connect(storedToken);
            }
          } else if (active) {
            setUser(parsedUser);
          }
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
      } finally {
        if (active) setLoading(false);
      }
    }

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const persistSession = (userData, token, remember = true) => {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem(TOKEN_STORAGE_KEY);
    otherStorage.removeItem(AUTH_USER_KEY);
    storage.setItem(TOKEN_STORAGE_KEY, token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const login = async ({ email, password, remember = true }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email address and password.');
    }

    if (!USE_MOCK_DATA) {
      const result = await authService.login({ email: cleanEmail, password });
      const userObj = result.user;
      persistSession(userObj, result.access_token, remember);
      wsService.connect(result.access_token);
      return userObj;
    }

    const users = loadRegisteredMockUsers();
    const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!matched) {
      throw new Error(
        'No account found for that email. Use one of the demo role sign-in buttons or register as a patient.'
      );
    }

    if (matched.password && matched.password !== password) {
      throw new Error('Incorrect password. Please check your credentials.');
    }

    persistSession(matched, `mock-token-${matched.id}`, remember);
    return matched;
  };

  const loginWithDemoRole = async (role) => {
    if (!USE_MOCK_DATA) {
      const demoEmail = INITIAL_USERS.find((u) => u.role === role)?.email;
      return login({ email: demoEmail, password: DEMO_PASSWORD, remember: true });
    }
    const users = loadRegisteredMockUsers();
    const demoUser = users.find((u) => u.role === role);
    if (!demoUser) {
      throw new Error(`No demo profile configured for role: ${role}`);
    }
    persistSession(demoUser, `mock-token-${demoUser.id}`, true);
    return demoUser;
  };

  const register = async ({ name, email, phone, password, role = 'patient', ...extra }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !phone.trim() || !password) {
      throw new Error('All registration fields are required.');
    }

    if (!USE_MOCK_DATA) {
      const result = await authService.register({
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        password,
        role,
        ...extra
      });
      const userObj = result.user;
      persistSession(userObj, result.access_token, true);
      wsService.connect(result.access_token);
      return userObj;
    }

    const users = loadRegisteredMockUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }

    if (role === 'admin' && (extra.adminCode || '').trim() !== MOCK_ADMIN_CODE) {
      throw new Error('That dispatcher access code is not valid.');
    }
    if (role === 'driver' && (extra.licenseNumber || '').trim().length < 5) {
      throw new Error('Enter your driving licence number.');
    }

    const newPatient = {
      id: `USR-${role.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password,
      role,
      address: '',
      emergencyContact: '',
      bloodGroup: 'Not specified',
      department: role === 'admin' ? extra.department || 'Emergency Dispatch' : undefined,
      licenseNumber: role === 'driver' ? extra.licenseNumber.trim().toUpperCase() : undefined,
      verificationStatus: role === 'driver' ? 'VERIFIED' : undefined
    };

    const updatedUsers = [...users, newPatient];
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
    persistSession(newPatient, `mock-token-${newPatient.id}`, true);
    return newPatient;
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    if (!USE_MOCK_DATA) {
      const fresh = await authService.updateProfile(updates);
      setUser(fresh);
      const storage = localStorage.getItem(AUTH_USER_KEY) ? localStorage : sessionStorage;
      storage.setItem(AUTH_USER_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const updated = { ...user, ...updates };
    setUser(updated);
    if (localStorage.getItem(AUTH_USER_KEY)) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    } else {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    }
    const users = loadRegisteredMockUsers().map((u) =>
      u.id === updated.id ? { ...u, ...updates } : u
    );
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  };

  const logout = () => {
    wsService.disconnect();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        isMockMode: USE_MOCK_DATA,
        login,
        loginWithDemoRole,
        register,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}