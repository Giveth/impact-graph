export interface IPrivadoAdapter {
  isUserVerified(userId: number): Promise<boolean>;
  checkUserVerified(userId: number): Promise<boolean>;
  privadoRequestId(): number;
}
