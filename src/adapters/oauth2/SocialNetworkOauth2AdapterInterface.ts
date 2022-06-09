export interface GetUserInfoByOauth2Output {
  username: string;
}

export interface SocialNetworkOauth2AdapterInterface {
  getAuthUrl(params: { socialProfileId: number }): Promise<string>;

  getUserInfoByOauth2Code(params: {
    oauth2Code: string;
    state: string;
  }): Promise<GetUserInfoByOauth2Output>;
}
