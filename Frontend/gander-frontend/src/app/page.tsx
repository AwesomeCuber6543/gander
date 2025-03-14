"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type Message = {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
};

type DocumentFile = {
  id: string;
  name: string;
  active: boolean;
  size?: number;
  uploadDate?: Date;
  type?: string;
};

type ApiResponse = {
  message?: string;
  document_ids: {
    [key: string]: {
      active: boolean;
      name: string;
    };
  };
};

type QueryResponse = {
  response: string;
};

export default function Home() {
  const [currentQuestion, setCurrentQuestion] = useState<Message | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<Message | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentQuestion, currentAnswer]);

  // Fetch all files on component mount
  useEffect(() => {
    fetchAllFiles();
  }, []);

  const fetchAllFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('http://localhost:8000/get_all_files', {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data: ApiResponse = await response.json();
      
      // Convert the document_ids object to an array of DocumentFile objects
      const fileArray: DocumentFile[] = Object.entries(data.document_ids)
        .map(([id, fileData]) => ({
          id,
          name: fileData.name,
          active: fileData.active,
          // Add default values for optional properties
          size: 0,
          uploadDate: new Date(),
          type: getFileType(fileData.name),
        }))
        .filter(file => file.active); // Only include active files
      
      setFiles(fileArray);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newQuestion: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setCurrentQuestion(newQuestion);
    setCurrentAnswer(null);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: inputMessage }),
      });

      if (!response.ok) {
        throw new Error('Query failed');
      }

      const data: QueryResponse = await response.json();

      const newAnswer: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "assistant",
        timestamp: new Date(),
      };

      setCurrentAnswer(newAnswer);
    } catch (error) {
      console.error('Error querying:', error);
      
      // Show error message
      const errorAnswer: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I couldn't process your question. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      };
      
      setCurrentAnswer(errorAnswer);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsLoadingFiles(true);
    
    try {
      const formData = new FormData();
      
      // Append each file to the form data
      Array.from(e.target.files).forEach((file) => {
        formData.append("file", file);
      });
      
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        mode: 'cors',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data: ApiResponse = await response.json();
      
      // Convert the document_ids object to an array of DocumentFile objects
      const fileArray: DocumentFile[] = Object.entries(data.document_ids)
        .map(([id, fileData]) => ({
          id,
          name: fileData.name,
          active: fileData.active,
          // Add default values for optional properties
          size: 0,
          uploadDate: new Date(),
          type: getFileType(fileData.name),
        }))
        .filter(file => file.active); // Only include active files
      
      setFiles(fileArray);
      
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsLoadingFiles(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async (fileName: string) => {
    setIsLoadingFiles(true);
    
    try {
      const response = await fetch(`http://localhost:8000/remove_file?file_name=${encodeURIComponent(fileName)}`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove file');
      }
      
      const data = await response.json();
      
      // Check if data.message exists and is an object
      if (data && data.message && typeof data.message === 'object') {
        // Convert the message object to an array of DocumentFile objects
        const fileArray: DocumentFile[] = Object.entries(data.message)
          .map(([id, fileData]: [string, any]) => ({
            id,
            name: fileData.name,
            active: fileData.active,
            // Add default values for optional properties
            size: 0,
            uploadDate: new Date(),
            type: getFileType(fileData.name),
          }))
          .filter(file => file.active); // Only include active files
        
        setFiles(fileArray);
      } else {
        console.error('Unexpected response format:', data);
      }
      
    } catch (error) {
      console.error('Error removing file:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Image 
              src="/vercel.svg" 
              alt="Logo" 
              width={24} 
              height={24} 
              className="mr-2 dark:invert" 
            />
            G550 Assistant
          </h1>
        </div>
        
        <div className="p-4 flex-1 overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Documents
            </h2>
            {isLoadingFiles && (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
          
          {files.length === 0 && !isLoadingFiles ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No documents uploaded yet</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li key={file.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <button
                      onClick={() => handleRemoveFile(file.name)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove file"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingFiles}
          >
            {isLoadingFiles ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Document
              </>
            )}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple 
            disabled={isLoadingFiles}
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            G550 Documentation Assistant
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask questions about your Gulfstream 550 aircraft
          </p>
        </header>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900" id="chat-messages">
          <div className="max-w-3xl mx-auto space-y-4">
            {!currentQuestion && !currentAnswer ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center p-8 max-w-md">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                    Welcome to G550 Documentation Assistant
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Upload your G550 documentation and ask questions about maintenance, operations, or any other aspect of your aircraft.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {currentQuestion && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg p-4 bg-blue-600 text-white">
                      <p>{currentQuestion.content}</p>
                      <p className="text-xs mt-1 text-blue-100">
                        {currentQuestion.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
                
                {currentAnswer && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
                      <p>{currentAnswer.content}</p>
                      <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                        {currentAnswer.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={isLoadingFiles}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about G550 documentation..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </footer>
      </div>
    </div>
  );
}
