import axios, { AxiosInstance } from 'axios';

export function makeClient(baseURL: string): AxiosInstance {
  return axios.create({ baseURL, timeout: 30_000 });
}
