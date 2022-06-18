import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import 'url-search-params-polyfill'; // shouldn't need this but will debug later

interface MeuralItem {
  id: number;
  image: string;
  originalImage: string;
}

export interface MeuralDevice {
  alias: string;
  id: number;
  // a bunch of others
}

interface MeuralGallery {
  id: number;
  name: string;
  description?: string;
  orientation: 'horizontal' | 'vertical';
}

export class MeuralClient {
  username: string;
  password: string;
  authToken: undefined | string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
    this.authToken = undefined;
  }

  get headers() {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Token ${this.authToken}`,
    };
  }

  async authenticate() {
    const params = new URLSearchParams();
    params.append('username', this.username);
    params.append('password', this.password);

    const response = await axios('https://api.meural.com/v1/authenticate', {
      method: 'POST',
      data: params,
    });

    this.authToken = response.data.token;
    return this.authToken;
  }

  async getUserDevices() {
    const response = await axios('https://api.meural.com/v1/user/devices', {
      headers: this.headers,
    });

    return response.data.data;
  }

  async getUserGalleries() {
    const response = await axios('https://api.meural.com/v1/user/galleries?count=100', {
      headers: this.headers,
    });

    return response.data.data;
  }

  async getGalleryItems(id: number): Promise<MeuralItem[]> {
    const response = await axios(`https://api.meural.com/v1/galleries/${id}/items`, {
      headers: this.headers,
    });

    return response.data.data;
  }

  async createGallery(
    name: string,
    description: string,
    orientation: MeuralGallery['orientation']
  ): Promise<MeuralGallery> {
    const params = new URLSearchParams();
    params.append('name', name);
    params.append('description', description);
    params.append('orientation', orientation);

    const response = await axios('https://api.meural.com/v1/galleries', {
      method: 'POST',
      headers: this.headers,
      data: params,
    });

    return response.data.data;
  }

  async createGalleryItem(galleryId: number, itemId: number): Promise<MeuralGallery> {
    const response = await axios(
      `https://api.meural.com/v1/galleries/${galleryId}/items/${itemId}`,
      {
        method: 'POST',
        headers: this.headers,
      }
    );

    return response.data.data;
  }

  async deleteItem(id: number): Promise<MeuralItem[]> {
    const response = await axios(`https://api.meural.com/v1/items/${id}`, {
      headers: this.headers,
      method: 'DELETE',
    });

    return response.data;
  }

  async createItem(filePath: string): Promise<MeuralItem> {
    const formdata = new FormData();
    formdata.append('image', fs.createReadStream(filePath));

    const response = await axios('https://api.meural.com/v1/items', {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'multipart/form-data',
        ...formdata.getHeaders(),
      },
      data: formdata,
    });

    return response.data.data;
  }

  async pushGalleryToDevice(deviceId: number, galleryId: number): Promise<any> {
    const response = await axios(
      `https://api.meural.com/v1/devices/${deviceId}/galleries/${galleryId}`,
      {
        method: 'POST',
        headers: this.headers,
      }
    );

    return response.data.data;
  }
}
