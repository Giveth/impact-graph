import { ProjectSocialMedia } from '../entities/projectSocialMedia.js';
import { ProjectSocialMediaType } from '../types/projectSocialMediaType.js';

export const addBulkProjectSocialMedia = async (
  socialMediaArray: {
    projectId: number;
    userId: number;
    type: ProjectSocialMediaType;
    link: string;
  }[],
): Promise<void> => {
  const socialMediaEntities = socialMediaArray.map(socialMediaInput => {
    const socialMedia = ProjectSocialMedia.create({
      type: socialMediaInput.type,
      link: socialMediaInput.link,
      projectId: socialMediaInput.projectId,
      userId: socialMediaInput.userId,
    });
    return socialMedia.save();
  });
  await Promise.all(socialMediaEntities);
};

export const removeProjectSocialMedia = async (
  projectId: number,
): Promise<void> => {
  const socialMediaLinks = await ProjectSocialMedia.find({
    where: { projectId },
  });
  if (socialMediaLinks.length > 0) {
    await ProjectSocialMedia.remove(socialMediaLinks);
  }
};
