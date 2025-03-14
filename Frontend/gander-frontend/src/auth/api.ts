// This file will contain your API endpoints for authentication and document operations

import { User } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiLogin = async (email: string, password: string): Promise<User> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};

export const apiLogout = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
};

export const uploadDocument = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
};

export const getAllFiles = async (): Promise<any> => {
  const response = await fetch(`${API_URL}/get_all_files`);

  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }

  return response.json();
};

export const removeFile = async (fileName: string): Promise<any> => {
  const response = await fetch(`${API_URL}/remove_file?file_name=${encodeURIComponent(fileName)}`);

  if (!response.ok) {
    throw new Error('Failed to remove file');
  }

  return response.json();
};

export const sendMessage = async (message: string): Promise<any> => {
  const response = await fetch(`${API_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
};
