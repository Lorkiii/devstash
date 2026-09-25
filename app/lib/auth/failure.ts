import "server-only";

export type SafeAuthFailureType =
  | "AccessDenied"
  | "AdapterError"
  | "CallbackRouteError"
  | "InvalidCheck"
  | "OAuthAccountNotLinked"
  | "OAuthCallbackError"
  | "OAuthProfileParseError"
  | "OAuthSignInError"
  | "SessionTokenError"
  | "SignOutError"
  | "UnknownAuthError"
  | "UntrustedHost";

export function getSafeAuthFailureType(error: unknown): SafeAuthFailureType {
  const type = typeof error === "object" && error !== null && "type" in error
    ? error.type
    : null;

  switch (type) {
    case "AccessDenied":
    case "AdapterError":
    case "CallbackRouteError":
    case "InvalidCheck":
    case "OAuthAccountNotLinked":
    case "OAuthCallbackError":
    case "OAuthProfileParseError":
    case "OAuthSignInError":
    case "SessionTokenError":
    case "SignOutError":
    case "UntrustedHost":
      return type;
    default:
      return "UnknownAuthError";
  }
}
