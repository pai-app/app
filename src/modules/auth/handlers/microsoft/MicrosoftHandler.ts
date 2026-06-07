import type { IAuthHandler } from "../../interfaces/IAuthHandler";
import type { IAuthToken } from "../../interfaces/IAuthToken";
import type { IAuthUser } from "../../interfaces/IAuthUser";

type TokenResponse = {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

type UserResponse = {
    id: string;
    displayName: string;
    mail: string;
}

export abstract class MicrosoftHandler implements IAuthHandler {
    id = 'microsoft';
    abstract featureName: string;
    abstract scopes: string[];

    private clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    // Derive the OAuth redirect URI from the current origin so production and
    // per-branch preview deployments each use their own callback domain. Must
    // stay byte-for-byte identical to the Worker-side value and a registered
    // redirect URI in the Microsoft app registration.
    private redirectUri = `${window.location.origin}/auth/callback`;

    async getLoginUrl(state: string): Promise<string> {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            response_mode: "query",
            state: state,
            scope: this.scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent',
        })

        return `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params.toString()}`;
    }

    async handleCode(code: string): Promise<IAuthToken> {
        const params = new URLSearchParams({
            handler: this.id,
            code: code,
        });

        const response = await fetch(`/api/token?${params.toString()}`, {
            method: 'POST'
        }).then(res => res.json<TokenResponse>());
        return this.parseToken(response);
    }

    async getValidToken(token: IAuthToken): Promise<IAuthToken> {
        if (token.expiry.getTime() > new Date().getTime()) {
            return token;
        }

        return await this.refreshToken(token);
    }

    private async refreshToken(token: IAuthToken): Promise<IAuthToken> {
        if (!token.refreshToken) throw new Error('No refresh token available');
        const params = new URLSearchParams({
            handler: this.id,
            token: token.refreshToken,
        });

        const response = await fetch(`/api/token?${params.toString()}`, {
            method: 'POST'
        }).then(res => res.json<TokenResponse>());
        const newToken = this.parseToken(response);
        newToken.refreshToken = token.refreshToken;
        return newToken;
    }

    async getUser(token: IAuthToken): Promise<IAuthUser> {
        token = await this.getValidToken(token);

        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
            }
        }).then(res => res.json<UserResponse>());
        return this.parseUser(response);
    }

    private parseToken(response: TokenResponse): IAuthToken {
        return {
            handlerId: this.id,
            featureName: this.featureName,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiry: new Date(new Date().getTime() + response.expires_in * 1000),
        }
    }

    private parseUser(response: UserResponse): IAuthUser {
        return {
            id: response.id,
            name: response.displayName,
            email: response.mail,
        }
    }
}