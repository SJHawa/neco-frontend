export type ApiMeta = {
  requestId: string;
};

export type ApiResponseError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  meta: ApiMeta;
  error: ApiResponseError | null;
};
