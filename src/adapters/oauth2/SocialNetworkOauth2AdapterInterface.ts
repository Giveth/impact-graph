export interface GetUserInfoByOauth2Output {
  username: string;
  name?: string;
  link?: string;
}

export interface SocialNetworkOauth2AdapterInterface {
  getAuthUrl(params: { trackId: string }): Promise<string>;

  getUserInfoByOauth2Code(params: {
    oauth2Code: string;
  }): Promise<GetUserInfoByOauth2Output>;
}
