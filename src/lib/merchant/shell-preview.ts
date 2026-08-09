export function isMerchantShellPreviewEnabled(
  environment: { NODE_ENV?: string; MERCHANT_SHELL_PREVIEW?: string },
): boolean {
  return (
    environment.NODE_ENV === "development" &&
    environment.MERCHANT_SHELL_PREVIEW === "true"
  );
}
