failureResponseCodes = [400, 401, 403, 404, 500];
successResponseCodes = [200, 201, 202, 204];    
export interface ApiFailureResponse<T = null> {
    traceId: string;
    statusCode: typeof failureResponseCodes;
    status: "FAILURE";
    timestamp: string; // ISO date string
    message: string;
    data: T;
  }
  export interface ApiSuccessResponse<T = null> {
    traceId: string;
    statusCode: typeof successResponseCodes; // 200, 201, 202, 204
    status: "FAILURE" | "SUCCESS";
    timestamp: string; // ISO date string
    message: string;
    data: T;
  }