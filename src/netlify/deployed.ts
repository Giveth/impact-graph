import { Project } from '../entities/project';
import { redis } from '../redis';
import { sendEmail } from '../utils/sendEmail';
import { createConfirmationUrl } from '../utils/createConfirmationUrl';
import SentryLogger from '../sentryLogger';
import { logger } from '../utils/logger';

async function notifyProject(project) {
  if (project.users && project.users.length) {
    const { email, id: userId } = project.users[0];
    await sendEmail(email, await createConfirmationUrl(userId));
  } else {
    const errorMessage = `Netlify deployed - Project no email for projectID  ---> : ${project.id}`;
    logger.error(errorMessage);
    SentryLogger.captureMessage(errorMessage);
  }
}

async function updateProjects(deployedProjects) {
  // James: hate how I did this, but spent too long trying to get the above to work
  deployedProjects.forEach(async projectId => {
    const project = await Project.findOne({
      where: { id: Number(projectId) },
      relations: ['users'],
    });
    if (project) {
      // const project = await Project.update({ statusId: 5 }, { id: Number(projectId) })
      project.statusId = 5;
      project.save();

      notifyProject(project);
    }
  });
}

export async function netlifyDeployed(request, response) {
  try {
    await redis.set('impact-graph:netlifyDeploy:isDeploying', false);
    // Get comma separated list
    const deployedProjects = await redis.get(
      'impact-graph:netlifyDeploy:projects:deploying',
    );

    logger.debug(
      `deployedProjects : ${JSON.stringify(deployedProjects, null, 2)}`,
    );

    if (deployedProjects) {
      await updateProjects(deployedProjects.split(','));
    }

    return response.json({ received: true });
  } catch (error) {
    logger.error('netlifyDeployed() error', error);
  }
}
