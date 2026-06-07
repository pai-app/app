import { AuthMatrix } from "@/modules/auth/AuthMatrix";
import type { IAuthToken } from "@/modules/auth/interfaces/IAuthToken";
import type { IAuthUser } from "@/modules/auth/interfaces/IAuthUser";
import { Utils } from "@/modules/common/Utils";
import { AuthAccountSchema, type AuthAccount } from "../entities/AuthAccount";
import { EntityName } from "../entities/entities";
import { BaseService } from "./BaseService";

type AuthState = {
    token?: IAuthToken;
}

export class AuthService extends BaseService {

    private authKey = 'fin-auth';
    private stateKey = 'fin-auth-state';
    private static validTokenPromises: Record<string, Promise<IAuthToken>> = {};

    // state format:
    // <handler-id>.<household-id>?
    async login(handlerId: string, householdId?: string) {
        const handler = AuthMatrix.Handlers[handlerId];
        if (!handler) throw new Error('Invalid auth handler');
        const state = householdId ? `${handlerId}.${householdId}` : `${handlerId}`;
        const loginUrl = await handler.getLoginUrl(state);
        window.location.href = loginUrl;
    }

    async process(useTokenForLogin: (token: IAuthToken) => Promise<void>, householdId?: string): Promise<string> {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
            const state = params.get("state");
            if (!state) throw new Error('Invalid state');
            return this.handleCallback(code, state, useTokenForLogin);
        } else if (householdId) {
            return this.getAndStoreToken(householdId);
        } else {
            return '/';
        }
    }

    async loginUsingToken(token: IAuthToken): Promise<IAuthUser> {
        const handler = AuthMatrix.Handlers[token.handlerId];
        if (!handler) throw new Error('Invalid auth handler');
        const user = await handler.getUser(token);
        if (!user) throw new Error('Failed to get user info');
        return user;
    }

    async getValidToken(token: IAuthToken, householdId?: string): Promise<IAuthToken> {
        const tokenStr = `token-${token.handlerId}-${token.featureName}-${token.refreshToken}-${householdId || ''}-${token.expiry.getTime()}`;
        const hash = Utils.generateHash(tokenStr);
        if (!AuthService.validTokenPromises[hash]) {
            AuthService.validTokenPromises[hash] = this.getValidTokenPromise(token, householdId);
        }
        return AuthService.validTokenPromises[hash];
    }

    logout(): void {
        this.clearAndGetLocalItem<IAuthToken>(this.authKey);
    }

    getTokenIfExists(): IAuthToken | null {
        const token = localStorage.getItem(this.authKey);
        if (!token) return null;
        return Utils.parseJson<IAuthToken>(token);
    }

    private async getValidTokenPromise(token: IAuthToken, householdId?: string): Promise<IAuthToken> {
        const handler = AuthMatrix.Handlers[token.handlerId];
        if (!handler) throw new Error('Invalid auth handler');
        const validToken = await handler.getValidToken(token);
        if (householdId) {
            const repo = this.repository(EntityName.AuthAccount);
            const accounts = await repo.getAll() as Array<AuthAccount>;
            const account = accounts.find(a => a.token.handlerId === validToken.handlerId && a.token.refreshToken === validToken.refreshToken);
            if (account) {
                account.token = validToken;
                repo.save({ ...account });
            }
        } else {
            this.storeLocalItem<IAuthToken>(this.authKey, validToken);
        }
        return validToken;
    }

    private async handleCallback(code: string, state: string, useTokenForLogin: (token: IAuthToken) => Promise<void>): Promise<string> {
        const split = state.split('.');
        if (split.length !== 1 && split.length !== 2) throw new Error('Invalid state format');

        const [handlerId, householdId] = split;
        const handler = AuthMatrix.Handlers[handlerId];
        if (!handler) throw new Error('Invalid auth handler');

        const token = await handler.handleCode(code);
        if (!token.accessToken) throw new Error('Failed to obtain access token');

        const authState = this.clearAndGetLocalItem<AuthState>(this.stateKey);

        if (householdId) {
            authState.token = token;
            this.storeLocalItem(this.stateKey, authState);
            return `/${householdId}/auth/callback`;
        } else {
            this.storeLocalItem(this.authKey, token);
            await useTokenForLogin(token);
            return '/';
        }
    }

    private async getAndStoreToken(householdId: string): Promise<string> {
        const authState = this.clearAndGetLocalItem<AuthState>(this.stateKey);

        const token = authState.token;
        if (!token) throw new Error('No token found in auth state');

        const handler = AuthMatrix.Handlers[token.handlerId];
        if (!handler) throw new Error('Invalid auth handler');

        const user = await handler.getUser(token);
        if (!user) throw new Error('Failed to get user info');

        const repo = this.repository(EntityName.AuthAccount);
        const accounts = await repo.getAll() as Array<AuthAccount>;
        const existingAccount = accounts.find(a =>
            a.token.handlerId === token.handlerId &&
            a.user.id === user.id
        );

        if (existingAccount) {
            existingAccount.token = token;
            existingAccount.user = user;
            repo.save(existingAccount);
        } else {
            repo.save(AuthAccountSchema.parse({ token, user }));
        }

        return `/${householdId}/import`;
    }

    private clearAndGetLocalItem<T>(key: string): T {
        const authStateJson = localStorage.getItem(key) ?? '{}';
        localStorage.removeItem(key);
        return Utils.parseJson<T>(authStateJson);
    }

    private storeLocalItem<T>(key: string, item: T): void {
        localStorage.setItem(key, Utils.stringifyJson(item));
    }

}