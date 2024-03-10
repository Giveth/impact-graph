import { registerEnumType } from 'type-graphql';

export enum ProjectSocialMediaType {
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  INSTAGRAM = 'INSTAGRAM',
  YOUTUBE = 'YOUTUBE',
  LINKEDIN = 'LINKEDIN',
  REDDIT = 'REDDIT',
  DISCORD = 'DISCORD',
  FARCASTER = 'FARCASTER',
  LENS = 'LENS',
  WEBSITE = 'WEBSITE',
}

registerEnumType(ProjectSocialMediaType, {
  name: 'ProjectSocialMediaType',
  description: 'The social media platform types',
});
