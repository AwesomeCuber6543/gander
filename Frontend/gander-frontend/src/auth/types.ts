// This file will contain type definitions for your authentication and document operations

export type Message = {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
};

export type DocumentFile = {
  id: string;
  name: string;
  active: boolean;
  size?: number;
  uploadDate?: Date;
  type?: string;
};

export type ApiResponse = {
  message?: string;
  document_ids: {
    [key: string]: {
      active: boolean;
      name: string;
    };
  };
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
  messages: Message[];
};
