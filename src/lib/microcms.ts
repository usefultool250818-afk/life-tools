import axios from "axios";

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN!;
const apiKey = process.env.MICROCMS_API_KEY!;

export const client = axios.create({
  baseURL: `https://${serviceDomain}.microcms.io/api/v1`,
  headers: { "X-API-KEY": apiKey },
});
