// This file will contain your authentication logic

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'inspector' | 'pilot' | 'admin';
};

// Mock current user - replace with actual auth logic
let currentUser: User | null = null;

export const login = async (email: string, password: string): Promise<User> => {
  // This would be replaced with an actual API call
  return new Promise((resolve, reject) => {
    // Simulate API delay
    setTimeout(() => {
      if (email && password) {
        currentUser = {
          id: '1',
          name: 'John Doe',
          email: email,
          role: 'inspector',
        };
        resolve(currentUser);
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 1000);
  });
};

export const logout = async (): Promise<void> => {
  // This would be replaced with an actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = null;
      resolve();
    }, 500);
  });
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const isAuthenticated = (): boolean => {
  return currentUser !== null;
};
