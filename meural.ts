import fetch from 'node-fetch';

interface MeuralImage {
  id: number;
  image: string;
  originalImage: string;
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
      'Content-Type': 'application/json',
      Authorization: `Token ${this.authToken}`,
    };
  }

  async authenticate() {
    var urlencoded = new URLSearchParams();
    urlencoded.append('username', this.username);
    urlencoded.append('password', this.password);

    const response = await fetch('https://api.meural.com/v1/authenticate', {
      method: 'POST',
      body: urlencoded,
    });

    const responseBody = await response.json();
    this.authToken = responseBody.token;
    return this.authToken;
  }

  async getUserGalleries() {
    const response = await fetch('https://api.meural.com/v1/user/galleries?count=100', {
      headers: this.headers,
    });

    const responseBody = await response.json();
    return responseBody.data;
  }

  async getGalleryItems(id: number): Promise<MeuralImage[]> {
    const response = await fetch(`https://api.meural.com/v1/galleries/${id}/items`, {
      headers: this.headers,
    });

    const responseBody = await response.json();
    return responseBody.data;
  }

  async deleteImage(id: number): Promise<MeuralImage[]> {
    const response = await fetch(`https://api.meural.com/v1/items/${id}`, {
      headers: this.headers,
      method: 'DELETE',
    });

    const responseBody = await response.json();
    return responseBody.data;
  }
}
