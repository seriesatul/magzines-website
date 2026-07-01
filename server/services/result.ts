export type ServiceResult<TData> =
  | {
      success: true;
      data: TData;
    }
  | {
      success: false;
      message: string;
    };

export function success<TData>(data: TData): ServiceResult<TData> {
  return { success: true, data };
}

export function failure<TData = never>(message: string): ServiceResult<TData> {
  return { success: false, message };
}
