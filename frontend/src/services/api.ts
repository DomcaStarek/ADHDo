import type {
  User,
  CleaningTask,
  FeedItem,
  SwipeResponse,
  MatchSummary,
  MatchDetail,
  Message,
} from '../types';

const BASE_URL = '/api/v1';

class ApiService {
  private getAccessToken(): string | null {
    return localStorage.getItem('adhdo_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('adhdo_refresh_token');
  }

  public setTokens(access: string, refresh: string) {
    localStorage.setItem('adhdo_access_token', access);
    localStorage.setItem('adhdo_refresh_token', refresh);
  }

  public clearTokens() {
    localStorage.removeItem('adhdo_access_token');
    localStorage.removeItem('adhdo_refresh_token');
    localStorage.removeItem('adhdo_current_user');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});

    // Attach access token if available
    const token = this.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration & auto-refresh
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry original request with new token
        headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
        response = await fetch(url, { ...options, headers });
      } else {
        this.clearTokens();
        window.dispatchEvent(new Event('adhdo:auth_expired'));
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // ignore parse error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
    } catch {
      // refresh failed
    }
    return false;
  }

  // --- Auth Endpoints ---
  async register(data: any): Promise<{ message: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async login(data: any): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const res = await this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setTokens(res.access_token, res.refresh_token);
    localStorage.setItem('adhdo_current_user', JSON.stringify(res.user));
    return res;
  }

  async logout(): Promise<void> {
    const refresh = this.getRefreshToken();
    if (refresh) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refresh }),
        });
      } catch {
        // ignore
      }
    }
    this.clearTokens();
  }

  // --- Users Endpoints ---
  async getMe(): Promise<User> {
    return this.request<User>('/users/me');
  }

  async updateMe(data: Partial<User>): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<User>('/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  // --- Tasks Endpoints ---
  async getMyActiveTask(): Promise<CleaningTask | null> {
    return this.request<CleaningTask | null>('/tasks/me/active');
  }

  async createCleaningTask(formData: FormData): Promise<CleaningTask> {
    return this.request<CleaningTask>('/tasks/', {
      method: 'POST',
      body: formData,
    });
  }

  async updateTask(taskId: string, data: Partial<CleaningTask>): Promise<CleaningTask> {
    return this.request<CleaningTask>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- Feed & Swipes ---
  async getFeed(): Promise<FeedItem[]> {
    return this.request<FeedItem[]>('/feed/');
  }

  async swipe(targetTaskId: string, action: 'like' | 'pass'): Promise<SwipeResponse> {
    return this.request<SwipeResponse>('/swipes/', {
      method: 'POST',
      body: JSON.stringify({ target_task_id: targetTaskId, action }),
    });
  }

  // --- Matches & Messages ---
  async getMatches(): Promise<MatchSummary[]> {
    return this.request<MatchSummary[]>('/matches');
  }

  async getMatchDetail(matchId: string): Promise<MatchDetail> {
    return this.request<MatchDetail>(`/matches/${matchId}`);
  }

  async unmatch(matchId: string): Promise<void> {
    return this.request(`/matches/${matchId}/unmatch`, { method: 'POST' });
  }

  async getMessages(matchId: string): Promise<{ items: Message[]; total: number }> {
    return this.request<{ items: Message[]; total: number }>(`/matches/${matchId}/messages`);
  }

  async sendMessage(matchId: string, content: string): Promise<Message> {
    return this.request<Message>(`/matches/${matchId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // --- Moderation ---
  async blockUser(userId: string, reason?: string): Promise<{ message: string }> {
    return this.request('/moderation/block', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, reason }),
    });
  }

  async reportUser(userId: string, reason: string, details?: string): Promise<{ message: string }> {
    return this.request('/moderation/report', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, reason, details }),
    });
  }
}

export const api = new ApiService();
