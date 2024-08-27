export interface IPrivadoAdapter {
  isUserVerified(userAddress: string): Promise<boolean>;
}
