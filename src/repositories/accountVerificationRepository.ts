import { AccountVerification } from '../entities/accountVerification';

export const createNewAccountVerification = async (
  associatedVerifications,
): Promise<AccountVerification[]> => {
  const accountVerifications = AccountVerification.create(
    associatedVerifications,
  );
  return AccountVerification.save(accountVerifications);
};
