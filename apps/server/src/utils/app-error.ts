export interface ErrorIssue {
  path: string;
  message: string;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: readonly ErrorIssue[];

  constructor(
    status: number,
    code: string,
    message: string,
    issues?: readonly ErrorIssue[],
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (issues) this.issues = issues;
  }
}
