import { apiClient } from "../../shared/api/apiClient";
import type {
  CheckNicknameResponse,
  SignupRequest,
  SignupResponse,
} from "../../shared/types/domain";
import { isAppError } from "../../shared/utils/appError";

type AuthApiClient = Pick<typeof apiClient, "get" | "post">;

const SIGNUP_ENDPOINT_PATH = "/auth/signup";
const LEGACY_SIGNUP_ENDPOINT_PATH = "/auth/register";

export function createAuthApi(client: AuthApiClient = apiClient) {
  return {
    async checkNicknameAvailability(nickname: string) {
      const response = await client.get<CheckNicknameResponse>(
        `/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`,
        {
          authMode: "none",
        },
      );

      if (!response) {
        throw new Error("Nickname availability response was empty.");
      }

      return response;
    },

    async signup(request: SignupRequest) {
      let response: SignupResponse | null = null;

      try {
        response = await client.post<SignupResponse>(SIGNUP_ENDPOINT_PATH, request, {
          authMode: "none",
        });
      } catch (error) {
        if (!isAppError(error) || error.status !== 404) {
          throw error;
        }

        response = await client.post<SignupResponse>(
          LEGACY_SIGNUP_ENDPOINT_PATH,
          request,
          {
            authMode: "none",
          },
        );
      }

      if (!response) {
        throw new Error("Signup response was empty.");
      }

      return response;
    },
  };
}

export const authApi = createAuthApi();
