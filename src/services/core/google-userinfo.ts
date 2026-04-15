type GoogleUserInfo = {
  readonly displayName: string
  readonly identifier: string
  readonly avatarUrl?: string
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) return fallback()

    const data = (await response.json()) as { name?: string; email?: string; picture?: string }
    return {
      displayName: data.name ?? data.email ?? "Unknown",
      identifier: data.email ?? "",
      avatarUrl: data.picture,
    }
  } catch {
    return fallback()
  }
}

function fallback(): GoogleUserInfo {
  return { displayName: "Unknown", identifier: "" }
}
