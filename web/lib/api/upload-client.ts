import { getAuthHeaders } from './auth-headers';
import { API_BASE_URL } from '../config';

export type ImageType = 'poster' | 'backdrop' | 'logo' | 'profile';

export interface UploadImageResponse {
  url: string;
  type: ImageType;
}

export class UploadClient {
  async uploadImage(file: File, type: ImageType): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = getAuthHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${API_BASE_URL}/upload/image?type=${type}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  }
}

export const uploadClient = new UploadClient();
