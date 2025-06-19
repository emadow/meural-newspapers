import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

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
      'x-meural-api-version': '3',
      Authorization: `Token ${this.authToken}`,
    };
  }

  async authenticate() {
    const client = new CognitoIdentityProviderClient({region: 'eu-west-1'});
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: '487bd4kvb1fnop6mbgk8gu5ibf',
      AuthParameters: {
        USERNAME: this.username,
        PASSWORD: this.password,
      },
    });

    const response = await client.send(command);
    this.authToken = response.AuthenticationResult?.AccessToken;
    return this.authToken;
  }

  async getUserDevices() {
    const response = await axios('https://api.meural.com/v0/user/devices', {
      headers: this.headers,
    });
    return response.data.data;
  }

  async getUserGalleries() {
    const response = await axios('https://api.meural.com/v0/user/galleries?count=100', {
      headers: this.headers,
    });

    return response.data.data;
  }

  async getGalleryItems(id: number): Promise<MeuralItem[]> {
    const response = await axios(`https://api.meural.com/v0/galleries/${id}/items?count=100`, {
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

    const response = await axios('https://api.meural.com/v0/galleries', {
      method: 'POST',
      headers: this.headers,
      data: params,
    });

    return response.data.data;
  }

  async createGalleryItem(galleryId: number, itemId: number): Promise<MeuralGallery> {
    const response = await axios(
      `https://api.meural.com/v0/galleries/${galleryId}/items/${itemId}`,
      {
        method: 'POST',
        headers: this.headers,
      }
    );

    return response.data.data;
  }

  async deleteItem(id: number): Promise<MeuralItem[]> {
    const response = await axios(`https://api.meural.com/v0/items/${id}`, {
      headers: this.headers,
      method: 'DELETE',
    });

    return response.data;
  }

  async createItem(filePath: string): Promise<MeuralItem> {
    const formdata = new FormData();
    formdata.append('image', fs.createReadStream(filePath));

    const response = await axios('https://api.meural.com/v0/items', {
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
      `https://api.meural.com/v0/devices/${deviceId}/galleries/${galleryId}`,
      {
        method: 'POST',
        headers: this.headers,
      }
    );

    return response.data.data;
  }
}
