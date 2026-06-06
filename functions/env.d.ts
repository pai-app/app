/// <reference types="@cloudflare/workers-types" />

interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_CALLBACK_URL: string
  MICROSOFT_CLIENT_ID: string
  MICROSOFT_CLIENT_SECRET: string
  MICROSOFT_CALLBACK_URL: string
  DEBUG?: string
}
