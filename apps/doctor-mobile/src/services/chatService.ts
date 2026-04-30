import apiClient from '../lib/apiClient';

export const getActiveSessions = (): Promise<any[]> => {
  return apiClient.get('/api/chats/sessions');
};

export const getMessagesForSession = (sessionId: string): Promise<any[]> => {
  return apiClient.get(`/api/chats/sessions/${sessionId}/messages`);
};

export const postMessage = (sessionId: string, message_content: string): Promise<any> => {
  return apiClient.post(`/api/chats/sessions/${sessionId}/message`, {
    message_content,
  });
};